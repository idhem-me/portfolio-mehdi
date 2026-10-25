import {notFound,permanentRedirect} from 'next/navigation';
import {tetrisEnabled} from '@/features/tetris/flags';
export const instant=false;
export const metadata={robots:{index:false,follow:false}};
export default async function LegacyTetris({params}:{params:Promise<{locale:string}>}){if(!tetrisEnabled)notFound();const {locale}=await params;permanentRedirect(`${locale==='fr'?'':'/'+locale}/jeux/tetris`);}
