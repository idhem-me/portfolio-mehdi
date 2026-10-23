from PIL import Image
from collections import deque
from pathlib import Path
import json, sys
import numpy as np
from PIL import ImageFilter

ROOT = Path(__file__).resolve().parent
SIZES = {
    "tile": (256,128), "cliff": (256,192),
    "1x1": (256,320), "2x1": (384,400),
    "2x2": (512,512), "3x3": (768,768),
    "icon": (128,128), "fx": (128,128)
}
DIAMONDS = {"tile":(256,128), "cliff":(256,128), "1x1":(256,128),
            "2x1":(384,192), "2x2":(512,256), "3x3":(768,384)}

def remove_flat_background(im, tol=30):
    im = im.convert("RGBA")
    px = im.load(); w,h=im.size
    seen=bytearray(w*h); q=deque()
    for x,y in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]:
        i=y*w+x
        if not seen[i]: seen[i]=1; q.append((x,y))
    bg=[im.getpixel(p)[:3] for p in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]]
    while q:
        x,y=q.popleft(); r,g,b,a=px[x,y]
        if min(sum(abs(c-d) for c,d in zip((r,g,b),c0)) for c0 in bg) <= tol*3:
            px[x,y]=(r,g,b,0)
            for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0<=nx<w and 0<=ny<h:
                    i=ny*w+nx
                    if not seen[i]: seen[i]=1; q.append((nx,ny))
    return im

def clean_alpha_fringe(im, erosion_px=1, pale_threshold=205):
    """Remove weak pale edge halos without recoloring solid subject pixels."""
    im = im.convert('RGBA')
    ar = np.array(im)
    alpha = ar[:, :, 3]
    # Edge ring defined from the alpha mask, not from object color alone.
    core = Image.fromarray((alpha > 15).astype('uint8') * 255)
    inner = np.array(core.filter(ImageFilter.MinFilter(2 * erosion_px + 1))) > 0
    ring = (alpha > 0) & ~inner
    pale = np.min(ar[:, :, :3], axis=2) >= pale_threshold
    weak = alpha < 225
    ar[:, :, 3][ring & pale & weak] = 0
    # Remove remaining nearly invisible alpha on the exterior.
    ar[:, :, 3][ring & (alpha < 24)] = 0
    return Image.fromarray(ar, 'RGBA')

def process_asset(asset_id, source=None, source_note=None, clean_halo=False):
    manifest=json.loads((ROOT/'manifest.json').read_text())
    a=next(x for x in manifest['assets'] if x['id']==asset_id)
    src=Path(source) if source else ROOT/'raw'/f'{asset_id}.png'
    im=Image.open(src).convert('RGBA')
    # Preserve true alpha; only flood-fill if corners appear opaque and similar.
    corners=[im.getpixel(p) for p in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]]
    if all(c[3]>240 for c in corners) and max(sum(abs(c[i]-corners[0][i]) for i in range(3)) for c in corners)<90:
        im=remove_flat_background(im)
    if clean_halo:
        im = clean_alpha_fringe(im, erosion_px=2)
    if source_note:
        a['note'] = (a.get('note', '') + ' ' + source_note).strip()
    a['source_resolution'] = [im.width, im.height]
    alpha=im.getchannel('A')
    bbox=alpha.point(lambda v: 255 if v>10 else 0).getbbox()
    if bbox: im=im.crop(bbox)
    fp=a['footprint']
    if fp=='reference':
        out=im
    elif fp in ('tile','cliff'):
        target=SIZES[fp]
        im.thumbnail(target, Image.Resampling.LANCZOS)
        out=Image.new('RGBA',target,(0,0,0,0))
        out.alpha_composite(im,((target[0]-im.width)//2,(target[1]-im.height)//2))
    else:
        target=SIZES.get(fp,SIZES['icon'])
        if fp in ('icon','fx'):
            maxw=int(target[0]*.84); maxh=int(target[1]*.84)
            im.thumbnail((maxw,maxh),Image.Resampling.LANCZOS)
            out=Image.new('RGBA',target,(0,0,0,0))
            out.alpha_composite(im,((target[0]-im.width)//2,(target[1]-im.height)//2))
        else:
            # Sprite should match footprint width and sit at bottom-center.
            targetw=DIAMONDS.get(fp,(256,128))[0]
            scale=targetw/max(1,im.width)
            nw=max(1,round(im.width*scale)); nh=max(1,round(im.height*scale))
            im=im.resize((nw,nh),Image.Resampling.LANCZOS)
            if nh>target[1]:
                im=im.resize((max(1,round(nw*target[1]/nh)),target[1]),Image.Resampling.LANCZOS)
                a['note']=(a.get('note','')+' Height reduced to fit canvas.').strip()
            out=Image.new('RGBA',target,(0,0,0,0))
            out.alpha_composite(im,((target[0]-im.width)//2,target[1]-im.height))
    ROOT.joinpath('png').mkdir(exist_ok=True); ROOT.joinpath('webp').mkdir(exist_ok=True)
    out.save(ROOT/'png'/f'{asset_id}.png')
    out.save(ROOT/'webp'/f'{asset_id}.webp','WEBP',quality=85)
    a['w'],a['h']=out.size
    a['status']='done'
    (ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    return out

def split_sheet(image, rows, cols, ids):
    """Split a white/transparent grid sheet and export only matching manifest IDs."""
    if len(ids) != rows * cols:
        raise ValueError('ids must match rows * cols')
    sheet = Image.open(image).convert('RGBA') if not isinstance(image, Image.Image) else image.convert('RGBA')
    outputs = {}
    for index, asset_id in enumerate(ids):
        r, c = divmod(index, cols)
        bounds = (round(c * sheet.width / cols), round(r * sheet.height / rows),
                  round((c + 1) * sheet.width / cols), round((r + 1) * sheet.height / rows))
        part = sheet.crop(bounds)
        part = remove_flat_background(part, tol=20)
        alpha_bbox = part.getchannel('A').point(lambda x: 255 if x > 10 else 0).getbbox()
        if alpha_bbox is None:
            raise ValueError(f'Empty sheet cell for {asset_id}')
        part = part.crop(alpha_bbox)
        source = ROOT / 'raw' / f'{asset_id}.png'
        source.parent.mkdir(exist_ok=True, parents=True)
        part.save(source)
        outputs[asset_id] = process_asset(asset_id, source, source_note=f'source: planche, {part.width}x{part.height} px')
    return outputs

if __name__=='__main__':
    if len(sys.argv)<2: raise SystemExit('usage: process.py ASSET_ID [source.png]')
    process_asset(sys.argv[1], sys.argv[2] if len(sys.argv)>2 else None)
