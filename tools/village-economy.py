from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import ColorScaleRule

wb = Workbook()
HEAD = PatternFill("solid", fgColor="2F5D50")
INPUT = PatternFill("solid", fgColor="FFF4CC")
WHITE = Font(bold=True, color="FFFFFF")
thin = Side(style="thin", color="CCCCCC")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

def header(ws, row, values):
    for i, v in enumerate(values, 1):
        c = ws.cell(row=row, column=i, value=v)
        c.fill, c.font, c.border = HEAD, WHITE, BORDER
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

def widths(ws, w):
    for i, x in enumerate(w):
        ws.column_dimensions[chr(65 + i)].width = x

# ------------------------------------------------------------------ Paramètres
p = wb.active
p.title = "Parametres"
header(p, 1, ["Paramètre", "Valeur", "Description"])
params = [
    ("buildGrowth", 1.15, "Multiplicateur du coût par exemplaire déjà construit"),
    ("upgradeGrowth", 1.6, "Multiplicateur du coût par niveau"),
    ("timeGrowth", 1.45, "Multiplicateur de durée par niveau"),
    ("timeCapSec", 28800, "Durée max d'un chantier (s) = 8 h"),
    ("prodGrowth", 1.1, "Bonus multiplicatif de production par niveau"),
    ("tileBase", 50, "Coût en or de la 1re tuile"),
    ("tileGrowth", 1.35, "Multiplicateur par tuile achetée"),
    ("startTiles", 36, "Tuiles débloquées au départ (6×6)"),
    ("maxTiles", 256, "Taille de la carte (16×16)"),
    ("storageBaseSec", 600, "Stockage = X secondes de production au niv 1"),
    ("storageLvlBonus", 0.25, "+% de stockage par niveau"),
    ("woodPerPlank", 2, "Bois consommé par planche (charpentier)"),
]
for r, (k, v, d) in enumerate(params, 2):
    p.cell(row=r, column=1, value=k)
    c = p.cell(row=r, column=2, value=v); c.fill = INPUT
    p.cell(row=r, column=3, value=d)
widths(p, [20, 12, 60])
p["A15"] = "💡 Les cellules jaunes sont modifiables : tout le classeur se recalcule."
P = {k: f"Parametres!$B${i}" for i, (k, _, _) in enumerate(params, 2)}

# ------------------------------------------------------------------ Bâtiments
b = wb.create_sheet("Batiments")
header(b, 1, ["id", "Nom", "Catégorie", "Taille", "Déblocage", "Or", "Bois", "Pierre", "Planches",
              "Temps base (s)", "Ressource", "Prod/s base", "MW", "Emplois", "Logement", "Pollution"])
buildings = [
    ("townhall", "Mairie", "municipal", "1x1", "Départ", 150, 80, 0, 0, 30, "gold", 0.2, -2, 3, 5, 0),
    ("house", "Maison", "residential", "1x1", "Départ", 20, 10, 0, 0, 10, "gold", 0.1, -1, 0, 2, 0),
    ("apartment", "Immeuble", "residential", "1x1", "Mairie 2", 80, 40, 20, 8, 40, "gold", 0.2, -2, 0, 6, 0),
    ("skyscraper", "Gratte-ciel", "residential", "1x1", "Mairie 5", 500, 200, 300, 40, 180, "gold", 0.5, -8, 0, 40, 0),
    ("shop", "Boutique", "commerce", "1x1", "Départ", 80, 40, 0, 0, 40, "gold", 0.25, -2, 3, 0, 0),
    ("sawmill", "Scierie", "industry", "1x1", "Départ", 30, 0, 0, 0, 15, "wood", 0.25, -2, 2, 0, 0),
    ("quarry", "Carrière", "industry", "1x1", "Mairie 2", 60, 40, 0, 0, 30, "stone", 0.15, -3, 3, 0, 0),
    ("factory", "Usine", "industry", "1x1", "Mairie 3", 250, 100, 150, 0, 90, "gold", 0.4, -5, 8, 0, 1),
    ("carpenter", "Charpentier", "industry", "1x1", "Mairie 2", 70, 20, 10, 0, 40, "planks", 0.1, -2, 2, 0, 0),
    ("school", "École", "education", "1x1", "Mairie 2", 120, 80, 0, 0, 60, "knowledge", 0.05, -2, 3, 0, 0),
    ("pharmacy", "Pharmacie", "service", "1x1", "Mairie 2", 90, 40, 20, 0, 45, "gold", 0.15, -2, 2, 0, 0),
    ("police", "Police", "service", "1x1", "Mairie 3", 120, 50, 40, 0, 50, "-", 0, -2, 3, 0, 0),
    ("fire_station", "Caserne", "service", "1x1", "Mairie 3", 130, 50, 50, 0, 55, "-", 0, -2, 4, 0, 0),
    ("church", "Église", "culture", "1x1", "Mairie 2", 100, 60, 40, 0, 50, "-", 0, -1, 1, 0, 0),
    ("park", "Parc", "leisure", "1x1", "Mairie 2", 60, 20, 10, 0, 30, "-", 0, 0, 0, 0, -1),
    ("tennis", "Tennis", "leisure", "1x1", "Mairie 3", 90, 30, 20, 0, 40, "-", 0, -1, 1, 0, 0),
    ("market", "Marché", "commerce", "2x2", "50 savoir", 300, 200, 100, 0, 120, "gold", 0.5, -4, 6, 0, 0),
    ("warehouse", "Entrepôt", "service", "1x1", "Mairie 3", 200, 150, 80, 0, 90, "-", 0, -1, 1, 0, 0),
    ("library", "Bibliothèque", "culture", "2x2", "200 savoir", 600, 300, 300, 0, 300, "knowledge", 0.2, -3, 4, 0, 0),
    ("fountain", "Fontaine", "leisure", "1x1", "Mairie 3", 150, 0, 50, 0, 60, "-", 0, 0, 0, 0, -1),
    ("coal_plant", "Centrale charbon", "energy", "2x1", "Départ", 100, 50, 80, 0, 60, "-", 0, 20, 4, 0, 1),
    ("solar_plant", "Centrale solaire", "energy", "1x1", "Mairie 4", 400, 100, 200, 0, 120, "-", 0, 12, 1, 0, 0),
    ("nuclear_plant", "Centrale nucléaire", "energy", "2x2", "Mairie 6 + 500 savoir", 8000, 2000, 3000, 0, 600, "-", 0, 150, 12, 0, 0),
    ("monument", "Monument", "culture", "2x2", "Mairie 8 + 1000 savoir", 50000, 20000, 20000, 0, 3600, "-", 0, -5, 6, 0, 0),
]
for r, row in enumerate(buildings, 2):
    for c, v in enumerate(row, 1):
        cell = b.cell(row=r, column=c, value=v); cell.border = BORDER
        if c >= 6 and c != 10: cell.fill = INPUT
widths(b, [14, 16, 12, 7, 22, 9, 9, 9, 10, 13, 11, 11, 7, 9, 9, 10])
b.freeze_panes = "C2"
LAST = len(buildings) + 1

# ------------------------------------------------------------------ Améliorations
u = wb.create_sheet("Ameliorations")
u["A1"] = "Bâtiment →"; u["A1"].font = Font(bold=True)
u["B1"] = "house"; u["B1"].fill = INPUT; u["B1"].font = Font(bold=True, size=12)
dv = DataValidation(type="list", formula1=f"=Batiments!$A$2:$A${LAST}", allow_blank=False)
u.add_data_validation(dv); dv.add("B1")
u["C1"] = "← choisis un bâtiment dans la liste"

def look(col):
    return f"INDEX(Batiments!${col}$2:${col}${LAST},MATCH($B$1,Batiments!$A$2:$A${LAST},0))"

# Colonnes : A id … F or, G bois, H pierre, I planches, J temps, K ressource, L prod
labels = [("D2", "Or base", "F"), ("F2", "Bois base", "G"), ("H2", "Pierre base", "H"),
          ("J2", "Temps base", "J"), ("L2", "Prod base", "L")]
for cell, lab, col in labels:
    u[cell] = lab
    nxt = u[cell].offset(column=1); nxt.value = f"={look(col)}"; nxt.font = Font(bold=True)
OR, BO, PI, TB, PB = "$E$2", "$G$2", "$I$2", "$K$2", "$M$2"

header(u, 4, ["Niveau actuel", "Coût Or →niv+1", "Coût Bois", "Coût Pierre",
              "Durée (s)", "Durée", "Prod/s à ce niv", "Gain prod/s si up",
              "Rentabilité (min)", "Or cumulé", "Temps cumulé", "Stockage (unités)"])
START, LEVELS = 5, 25
for i in range(LEVELS):
    r = START + i
    u[f"A{r}"] = i + 1
    u[f"B{r}"] = f"=ROUNDUP({OR}*{P['upgradeGrowth']}^A{r},0)"
    u[f"C{r}"] = f"=ROUNDUP({BO}*{P['upgradeGrowth']}^A{r},0)"
    u[f"D{r}"] = f"=ROUNDUP({PI}*{P['upgradeGrowth']}^A{r},0)"
    u[f"E{r}"] = f"=MIN(ROUND({TB}*{P['timeGrowth']}^A{r},0),{P['timeCapSec']})"
    u[f"F{r}"] = f"=E{r}/86400"; u[f"F{r}"].number_format = "[h]:mm:ss"
    u[f"G{r}"] = f"={PB}*A{r}*{P['prodGrowth']}^A{r}"; u[f"G{r}"].number_format = "0.000"
    u[f"H{r}"] = f"={PB}*(A{r}+1)*{P['prodGrowth']}^(A{r}+1)-G{r}"; u[f"H{r}"].number_format = "0.000"
    u[f"I{r}"] = f'=IF(H{r}>0,B{r}/H{r}/60,"-")'; u[f"I{r}"].number_format = "#,##0.0"
    u[f"J{r}"] = f"=SUM($B${START}:B{r})"
    u[f"K{r}"] = f"=SUM($E${START}:E{r})/86400"; u[f"K{r}"].number_format = "[h]:mm:ss"
    u[f"L{r}"] = f"=G{r}*{P['storageBaseSec']}*(1+{P['storageLvlBonus']}*(A{r}-1))"
    u[f"L{r}"].number_format = "#,##0"
    for col in "BCDJ": u[f"{col}{r}"].number_format = "#,##0"
END = START + LEVELS - 1
u.conditional_formatting.add(f"I{START}:I{END}",
    ColorScaleRule(start_type="min", start_color="C6EFCE", end_type="max", end_color="FFC7CE"))
widths(u, [13, 14, 11, 11, 10, 10, 13, 15, 15, 13, 13, 15])
u.freeze_panes = "B5"
u[f"A{END+2}"] = ("Rentabilité = minutes de production nécessaires pour rembourser l'amélioration "
                  "en or. Si elle explose trop vite → le joueur décroche ; trop lente → jeu fini trop vite.")

ch = LineChart(); ch.title = "Coût vs production (échelle log)"
ch.y_axis.scaling.logBase = 10; ch.x_axis.title = "Niveau"; ch.height, ch.width = 9, 18
ch.add_data(Reference(u, min_col=2, min_row=4, max_row=END), titles_from_data=True)
ch.add_data(Reference(u, min_col=12, min_row=4, max_row=END), titles_from_data=True)
ch.set_categories(Reference(u, min_col=1, min_row=START, max_row=END))
u.add_chart(ch, "N4")

# ------------------------------------------------------------------ Constructions (n-ième exemplaire)
c = wb.create_sheet("Constructions")
header(c, 1, ["Nb déjà possédés"] + [row[1] for row in buildings])
for n in range(31):
    r = n + 2
    c.cell(row=r, column=1, value=n)
    for j in range(len(buildings)):
        cell = c.cell(row=r, column=j + 2,
                      value=f"=ROUNDUP(Batiments!$E${j+2}*{P['buildGrowth']}^$A{r},0)")
        cell.number_format = "#,##0"
widths(c, [16] + [12] * len(buildings))
c.freeze_panes = "B2"
c["A35"] = "Coût en OR du prochain exemplaire (bois/pierre suivent le même multiplicateur)."

# ------------------------------------------------------------------ Tuiles
t = wb.create_sheet("Tuiles")
header(t, 1, ["Tuile achetée n°", "Coût (or)", "Coût cumulé", "Tuiles débloquées", "% carte"])
MAXK = 220
for k in range(MAXK):
    r = k + 2
    t[f"A{r}"] = k + 1
    t[f"B{r}"] = f"=ROUNDUP({P['tileBase']}*{P['tileGrowth']}^(A{r}-1),0)"
    t[f"C{r}"] = f"=SUM($B$2:B{r})"
    t[f"D{r}"] = f"={P['startTiles']}+A{r}"
    t[f"E{r}"] = f"=D{r}/{P['maxTiles']}"
    for col in "BC": t[f"{col}{r}"].number_format = "#,##0"
    t[f"E{r}"].number_format = "0%"
widths(t, [16, 18, 20, 17, 9])
t.freeze_panes = "A2"
tc = LineChart(); tc.title = "Coût des tuiles (log)"; tc.y_axis.scaling.logBase = 10
tc.height, tc.width = 9, 16
tc.add_data(Reference(t, min_col=2, min_row=1, max_row=61), titles_from_data=True)
tc.set_categories(Reference(t, min_col=1, min_row=2, max_row=61))
t.add_chart(tc, "G2")

# ------------------------------------------------------------------ Simulation simple
s = wb.create_sheet("Simulation")
s["A1"] = "Revenu en or estimé selon le village (saisis la composition)"; s["A1"].font = Font(bold=True, size=12)
header(s, 3, ["Bâtiment", "Quantité", "Niveau moyen", "Or/s total", "Bois/s", "Pierre/s", "Savoir/s",
              "Travailleurs", "Population"])
for i, row in enumerate(buildings):
    r = i + 4; br = i + 2
    s[f"A{r}"] = row[1]
    s[f"B{r}"] = 1 if row[0] in ("townhall", "house", "sawmill") else 0
    s[f"C{r}"] = 1
    s[f"B{r}"].fill = s[f"C{r}"].fill = INPUT
    prod = f"Batiments!$J${br}*C{r}*{P['prodGrowth']}^C{r}*B{r}"
    for col, res in zip("DEFG", ["gold", "wood", "stone", "knowledge"]):
        s[f"{col}{r}"] = f'=IF(Batiments!$I${br}="{res}",{prod},0)'
        s[f"{col}{r}"].number_format = "0.000"
    s[f"H{r}"] = f"=Batiments!$K${br}*B{r}"
    s[f"I{r}"] = f"=Batiments!$L${br}*B{r}*C{r}"
tot = len(buildings) + 4
s[f"A{tot}"] = "TOTAL"; s[f"A{tot}"].font = Font(bold=True)
for col in "DEFGHI":
    s[f"{col}{tot}"] = f"=SUM({col}4:{col}{tot-1})"; s[f"{col}{tot}"].font = Font(bold=True)
s[f"A{tot+2}"] = "Or / heure"; s[f"B{tot+2}"] = f"=D{tot}*3600"
s[f"A{tot+3}"] = "Population libre"; s[f"B{tot+3}"] = f"=I{tot}-H{tot}"
s[f"A{tot+4}"] = "Prochaine tuile n°"; s[f"B{tot+4}"] = 10; s[f"B{tot+4}"].fill = INPUT
s[f"A{tot+5}"] = "Heures de jeu pour la payer"
s[f"B{tot+5}"] = f"=INDEX(Tuiles!$B$2:$B${MAXK+1},B{tot+4})/MAX(B{tot+2},0.0001)"
s[f"B{tot+2}"].number_format = "#,##0"; s[f"B{tot+5}"].number_format = "0.0"
widths(s, [26, 10, 13, 11, 9, 9, 9, 13, 11])

wb.save("village_economie.xlsx")
print("✅ village_economie.xlsx généré")
