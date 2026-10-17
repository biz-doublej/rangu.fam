"use strict";(()=>{var e={};e.id=6394,e.ids=[6394],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8678:e=>{e.exports=import("pg")},33338:(e,t,a)=>{a.a(e,async(e,i)=>{try{a.r(t),a.d(t,{originalPathname:()=>w,patchFetch:()=>p,requestAsyncStorage:()=>d,routeModule:()=>l,serverHooks:()=>m,staticGenerationAsyncStorage:()=>c});var s=a(49303),r=a(88716),n=a(60670),o=a(95433),u=e([o]);o=(u.then?(await u)():u)[0];let l=new s.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/wiki/stats/route",pathname:"/api/wiki/stats",filename:"route",bundlePath:"app/api/wiki/stats/route"},resolvedPagePath:"C:\\Users\\jaewo\\Desktop\\rangu.fam\\src\\app\\api\\wiki\\stats\\route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:d,staticGenerationAsyncStorage:c,serverHooks:m}=l,w="/api/wiki/stats/route";function p(){return(0,n.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:c})}i()}catch(e){i(e)}})},95433:(e,t,a)=>{a.a(e,async(e,i)=>{try{a.r(t),a.d(t,{GET:()=>p,dynamic:()=>l,revalidate:()=>d});var s=a(87070),r=a(62315),n=a(63719),o=e([n]);n=(o.then?(await o)():o)[0];let l="force-dynamic",d=600;function u(e){let[t,a]=e.split("-").map(Number);return 12*t+(a-1)}async function p(){try{let t,a;let i=(0,n.z)(),o=((t=await i.execute((0,r.i6)`
      SELECT
        (SELECT COUNT(*) FROM wiki_pages WHERE is_deleted = false)::int AS pages,
        (SELECT COUNT(*) FROM wiki_revisions)::int AS edits,
        (SELECT COUNT(DISTINCT author) FROM wiki_revisions WHERE author IS NOT NULL AND author <> '')::int AS contributors,
        (SELECT COALESCE(SUM(views), 0) FROM wiki_pages WHERE is_deleted = false)::int AS views
    `)).rows??t)[0]||{pages:0,edits:0,contributors:0,views:0},p=((a=await i.execute((0,r.i6)`
      SELECT
        date_part('year', timestamp_at AT TIME ZONE 'Asia/Seoul')::int AS year,
        COUNT(*)::int AS edits,
        COUNT(*) FILTER (WHERE edit_type = 'create')::int AS new_pages,
        COUNT(DISTINCT author)::int AS contributors
      FROM wiki_revisions
      GROUP BY 1
      ORDER BY 1
    `)).rows??a).map(e=>({year:Number(e.year),edits:Number(e.edits),newPages:Number(e.new_pages),contributors:Number(e.contributors)})).sort((e,t)=>t.year-e.year),l=await i.execute((0,r.i6)`
      SELECT to_char(date_trunc('month', timestamp_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM') AS month,
             COUNT(*)::int AS edits
      FROM wiki_revisions
      GROUP BY 1
    `),d=new Map;for(let e of l.rows??l)e.month&&d.set(e.month,Number(e.edits));let c=await i.execute((0,r.i6)`
      SELECT to_char(date_trunc('month', created_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM') AS month,
             COUNT(*)::int AS new_pages
      FROM wiki_pages
      WHERE is_deleted = false
      GROUP BY 1
    `),m=new Map;for(let e of c.rows??c)e.month&&m.set(e.month,Number(e.new_pages));let w=new Date(Date.now()+324e5),h=12*w.getUTCFullYear()+w.getUTCMonth(),E=[...d.keys(),...m.keys()].map(u),g=E.length>0?Math.min(...E):h,S=Math.max(h,E.length>0?Math.max(...E):h),T=[],C=0;for(let t=g;t<=S;t++){var e;let a=(e=t,`${Math.floor(e/12)}-${String(e%12+1).padStart(2,"0")}`),i=m.get(a)||0;C+=i,T.push({month:a,edits:d.get(a)||0,newPages:i,cumulativePages:C})}let O=T.slice(-24),A=T.length>0?T.reduce((e,t)=>t.edits>e.edits?t:e,T[0]):null,M=p.find(e=>e.year===w.getUTCFullYear())||null;return s.NextResponse.json({success:!0,generatedAt:new Date().toISOString(),totals:o,thisYear:M?{year:M.year,edits:M.edits,newPages:M.newPages}:{year:w.getUTCFullYear(),edits:0,newPages:0},byYear:p,monthly:O,peakMonth:A?{month:A.month,edits:A.edits}:null})}catch(e){return console.error("wiki stats 조회 오류:",e),s.NextResponse.json({success:!1,error:"통계를 불러오지 못했습니다."},{status:500})}}i()}catch(e){i(e)}})}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),i=t.X(0,[8948,5972,6001,3719],()=>a(33338));module.exports=i})();