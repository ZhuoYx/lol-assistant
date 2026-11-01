// UI review fixture only. Run after pnpm build:desktop; no LCU connection or writes.
// node packages/desktop/scripts/preview-ui.cjs -> http://127.0.0.1:5179/audit?w=1024&theme=dark
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../out/renderer');
const ids=[99,222,157,117,777,17,64,103,51,412];
const names=['光辉女郎 - 拉克丝','暴走萝莉 - 金克丝','疾风剑豪 - 亚索','仙灵女巫 - 璐璐','封魔剑魂 - 永恩','迅捷斥候 - 提莫','盲僧 - 李青','九尾妖狐 - 阿狸','皮城女警 - 凯特琳','魂锁典狱长 - 锤石'];
const matches=Array.from({length:65},(_,i)=>({gameId:1248573906-i,championId:ids[i%10],championName:names[i%10],win:i%3!==0,kills:6+i%8,deaths:2+i%6,assists:4+i%10,gameCreation:Date.now()-i*3600000,gameDuration:1800,queueId:i%4===0?450:420,gameMode:'CLASSIC',gameType:'MATCHED_GAME',lane:'MIDDLE',role:'SOLO',items:[6655,4646,3020,3089,3137,3364],isMVP:i===1,isSVP:i===0,totalDamageDealtToChampions:20000+i*600,totalDamageTaken:18000+i*900,goldEarned:10000+i*100}));
const players=ids.map((id,i)=>({puuid:'preview-'+i,summonerName:i===0?'今天也要和星光一起远行':'示例召唤师'+(i+1),championId:id,championName:names[i],tier:i%2?'DIAMOND':'EMERALD',division:'II',leaguePoints:56,championWinRate:.55,championGamesPlayed:35,championMasteryLevel:12,recentWinRate:.6,recentKDA:3.45,dataStatus:'loaded',position:['TOP','JUNGLE','MIDDLE','BOTTOM','UTILITY'][i%5],recentMatches:matches.slice(0,10)}));
const mayhemRecommendations={};for(const id of [157,99,222,17,117,777]){const file=path.resolve(__dirname,'../../../specs/aram-source/recommendations-'+id+'.json');if(fs.existsSync(file))mayhemRecommendations[id]=JSON.parse(fs.readFileSync(file,'utf8'));}
const iconFile=path.resolve(__dirname,'../../../specs/aram-source/icon-fixture.json');const mayhemIcons=fs.existsSync(iconFile)?JSON.parse(fs.readFileSync(iconFile,'utf8')):{};
const data={ids,names,matches,players,mayhemRecommendations,mayhemIcons};
function shim(data){
 const query=new URLSearchParams(location.search);localStorage.setItem('lol-assistant-theme',query.get('theme')||'dark');localStorage.setItem('lol-assistant-wallpaper','anime');
 const updateListeners=new Set();let updateState={status:query.get('update')||'idle',currentVersion:'1.0.0',supported:!query.has('dev-update'),autoUpdate:true,downloadPercent:query.get('update')==='downloading'?42:query.get('update')==='downloaded'?100:0,updateInfo:['available','downloading','downloaded'].includes(query.get('update'))?{version:'1.0.1'}:null,error:query.get('update')==='error'?'尚未发布可用的更新，或发布文件不完整，请稍后重试。':null};const emitUpdate=()=>{updateListeners.forEach(fn=>fn({...updateState}));return {...updateState};};
 const mayhem=query.get('mode')==='mayhem';let source='opgg',started=false;const phases=new Set();const phase=query.get('phase')==='draft'?'ChampSelect':query.get('phase')==='live'?'InProgress':'Lobby';
 const rank={tier:'EMERALD',division:'II',leaguePoints:56,wins:126,losses:98};
 const builds={championId:99,role:'mid',patch:'16.21',dataSource:'opgg',availableRoles:['mid','support'],
 runeBuilds:[{name:'热门符文推荐 · 奥术彗星',primaryTree:8200,secondaryTree:8100,primaryPerks:[8229,8226,8210,8237],secondaryPerks:[8126,8106],statShards:[5005,5008,5001],pickRate:45.8,winRate:52.4,sampleSize:25346}],
 itemBuilds:[{name:'热门核心出装',items:[6655,4646,3089],startingItems:[1056,2003],boots:3020,pickRate:38.2,winRate:54.6,sampleSize:21678}],
 skillPriority:['E','Q','W'],skillOrder:['E','Q','W','E','E','R','E','Q','E','Q','R','Q','Q','W','W','R','W','W']};
 builds.runeBuilds=Array.from({length:3},(_,i)=>({...builds.runeBuilds[0],name:'符文配置 '+(i+1),winRate:52.4-i*.8}));
 builds.itemBuilds=Array.from({length:15},(_,i)=>({...builds.itemBuilds[0],name:'出装方案 '+(i+1),winRate:54.6-i*.2}));
 const members=(team)=>data.ids.slice(team*5,team*5+5).map((id,i)=>({cellId:team*5+i,championId:id,summonerId:i+1,team:team+1,assignedPosition:['top','jungle','middle','bottom','utility'][i]}));
 const session={benchEnabled:mayhem,benchChampions:mayhem?[{championId:157},{championId:17}]:[],myTeam:members(0),theirTeam:members(1),bans:{myTeamBans:[238,84,777],theirTeamBans:[517,25,350]},actions:[],localPlayerCellId:0,timer:{phase:'BAN_PICK',adjustedTimeLeftInPhase:44000}};
 const api={
 exportLog:async()=>query.get('log-export')==='error'?{status:'error',message:'测试保存位置不可写，请尝试其他保存位置。'}:query.get('log-export')==='empty'?{status:'empty'}:query.get('log-export')==='saved'?{status:'saved',filePath:'D:/dev/code/lol-assistant/specs/previews/log-export-example.txt',fileCount:2,skippedCount:0,truncated:false}:{status:'cancelled'},revealExportedLog:async()=>true,
 getMayhemRecommendations:async id=>{if(query.has('mayhem-error'))throw Error('测试网络暂不可用');const result=data.mayhemRecommendations[id];if(!result)throw Error('当前预览未配置该英雄的来源样本');return {...result,stale:query.has('mayhem-stale')};},openMayhemSource:async()=>{},
 getChampionDataSource:async()=>source,setChampionDataSource:async v=>(source=v),getIsFirstLaunch:async()=>query.has('onboarding'),
 detectLolPath:async()=>query.has('no-lol-path')?null:'D:/Program Files (x86)/英雄联盟(26)/LeagueClient',selectLolPath:async()=>null,validateLolPath:async value=>!!value&&!query.has('invalid-lol-path'),getSavedLolPath:async()=>null,saveLolPath:async()=>{},setFirstLaunchDone:async()=>{},
 lcuGetStatus:async()=>query.has('disconnected')?'disconnected':'connected',
 getCurrentSummoner:async()=>({puuid:'preview-0',summonerId:1,accountId:1,displayName:'星光漫游者',gameName:'星光漫游者',tagLine:'STARS',internalName:'Star',profileIconId:1,summonerLevel:186,xpSinceLastLevel:1200,xpUntilNextLevel:2400}),
 getSummonerById:async()=>api.getCurrentSummoner(),
 getSummonerIcon:async id=>'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/'+id+'.jpg',
 getRankStats:async()=>({queueMap:{RANKED_SOLO_5x5:{...rank,queueType:'RANKED_SOLO_5x5'},RANKED_FLEX_SR:{...rank,tier:'DIAMOND',queueType:'RANKED_FLEX_SR'}}}),
 getCachedAsset:async url=>data.mayhemIcons[url]||url,
 getMatchList:async p=>{const begin=p.begIndex??0;const count=(p.endIndex??begin+9)-begin+1;const filtered=data.matches.filter(m=>p.queue===undefined||m.queueId===p.queue);const page=filtered.slice(begin,begin+count);return {matches:page,totalGames:0,pageGameIds:page.map(m=>m.gameId),hasMore:page.length===count,source:'sgp'};},
 getMatchDetail:async gameId=>{const detail=({gameId,queueId:420,gameMode:'CLASSIC',gameType:'MATCHED_GAME',gameCreation:Date.now()-3600000,gameDuration:1800,teams:[{teamId:100,win:true,bans:[],objectives:{}},{teamId:200,win:false,bans:[],objectives:{}}],participants:data.players.map((p,i)=>({...p,participantId:i+1,teamId:i<5?100:200,tagLine:'STARS',win:i<5,kills:8+i,deaths:3,assists:7,totalDamageDealt:50000-i*3500,totalDamageDealtToChampions:50000-i*3500,totalDamageTaken:i===1?60000:20000+i*1500,physicalDamageDealtToChampions:(50000-i*3500)*.6,magicDamageDealtToChampions:(50000-i*3500)*.3,trueDamageDealtToChampions:(50000-i*3500)*.1,totalDamageDealtAllTargets:200000-i*8000,physicalDamageDealt:110000-i*4400,magicDamageDealt:80000-i*3200,trueDamageDealt:10000-i*400,physicalDamageTaken:(i===1?60000:20000+i*1500)*.6,magicDamageTaken:(i===1?60000:20000+i*1500)*.3,trueDamageTaken:(i===1?60000:20000+i*1500)*.1,damageDealtToObjectives:5000+i*500,goldSpent:14000-i*700,wardsPlaced:8+i,wardsKilled:i,visionWardsBoughtInGame:i%3,totalTimeSpentDead:80+i*15,goldEarned:14500-i*700,visionScore:15+i*6,totalHeal:3000+i*500,totalHealsOnTeammates:i===3?12000:500+i*100,totalDamageShieldedOnTeammates:1000+i*200,timeCCingOthers:5+i*3,totalMinionsKilled:180+i*9,neutralMinionsKilled:20,damageDealtToTurrets:1000+i*500,damageSelfMitigated:20000+i*1000,largestMultiKill:i===0?4:1,firstBloodKill:i===0,items:[6655,4646,3020,3089,3137,3364,2003],perks:{perkStyle:8200,perkSubStyle:8100,perkIds:[]},lane:['TOP','JUNGLE','MIDDLE','BOTTOM','UTILITY'][i%5],role:'SOLO'}))});if(query.has('chart-missing'))for(const [index,player] of detail.participants.entries()){delete player.physicalDamageDealtToChampions;if(index<5)delete player.totalHeal;else player.totalHeal=0;}return detail;},
 getChampionStats:async()=>data.ids.map((id,i)=>({championId:id,championName:data.names[i],gamesPlayed:30-i,wins:18,losses:12-i,winRate:.6,avgKills:6,avgDeaths:3,avgAssists:8,avgKDA:4.67,mvpCount:3,svpCount:1,lastPlayed:Date.now()-i*86400000})),
 getChampionBuilds:async(championId,role)=>({...builds,championId,role:role||'mid',dataSource:source}),
 getChampionRankings:async(position,tier)=>({patch:'16.21',tier:tier||'emerald_plus',position:position||'none',rankings:data.ids.map((id,i)=>({championId:id,position:position||['mid','adc','top','support','top','top','jungle','mid','adc','support'][i],tier:i%4+1,rank:i+1,rankPrev:i+2,winRate:.49+i*.006,pickRate:.04+i*.003,banRate:.08,kda:3.23,games:28456-i*500}))}),
 getChampionCounters:async championId=>({championId,role:'mid',dataSource:source,hardCounters:data.ids.slice(0,5).map(id=>({championId:id,winRate:54.3,sampleSize:1234})),easyMatchups:[]}),
 getChampSelectSession:async()=>phase==='ChampSelect'?session:null,getAramTierList:async()=>[],
 getGameflowState:async()=>({phase,queueId:mayhem?2400:420}),
 analyzeLiveGame:async()=>({gameId:1248573906,gameMode:mayhem?'KIWI':'CLASSIC',queueId:mayhem?2400:420,teams:[{teamId:100,players:data.players.slice(0,5)},{teamId:200,players:data.players.slice(5)}]}),
 getGameVersion:async()=>'',getMetadata:async()=>null,getScraperDataVersion:async()=>({patch:'16.21',source,lastUpdated:Date.now()}),
 getCacheStats:async()=>({totalSize:2345678,totalEntries:18,byType:{}}),getUpdateStatus:async()=>({...updateState}),onUpdateStateChange:fn=>{updateListeners.add(fn);return()=>updateListeners.delete(fn);},setAutoUpdate:async enabled=>{updateState.autoUpdate=enabled;return emitUpdate();},checkForUpdates:async()=>{updateState.status=query.get('update')==='error'?'error':'not-available';return emitUpdate();},downloadUpdate:async()=>{updateState.status='downloaded';updateState.downloadPercent=100;return emitUpdate();},installUpdate:async()=>({...updateState}),
 getAutoAccept:async()=>({enabled:false,delay:0}),getProxyStatus:async()=>({running:false,address:null}),
 getClientStatus:async()=>({statusMessage:'星光不问赶路人',availability:'chat'}),getClientSettings:async()=>({}),
 getAppVersion:async()=>'1.0.0',getClientPath:async()=>'D:/Riot Games/League of Legends',
 onGamePhaseChange:fn=>{phases.add(fn);if(!started){started=true;setTimeout(()=>phases.forEach(cb=>cb(phase)),150);}return()=>phases.delete(fn);}
 };
 window.electronAPI=new Proxy(api,{get:(target,key)=>target[key]||(String(key).startsWith('on')?()=>()=>{}:async()=>null)});
 // Opt-in frame sampling for real route clicks; never included in the shipped app.
 if(query.has('motion-audit'))addEventListener('load',()=>{
 const output=document.createElement('output');output.id='motion-audit';output.hidden=true;document.body.append(output);
 document.addEventListener('click',event=>{
 if(!event.target.closest('.nav-item'))return;
 const frames=[];
 const sample=()=>{
 const page=document.querySelector('.page');
 const panels=[...(page?.querySelectorAll('.glass-panel,.card')||[])];
 const invalid=panels.filter(panel=>{
 if(getComputedStyle(panel).backdropFilter==='none')return true;
 for(let node=panel;node;node=node.parentElement)if(Number(getComputedStyle(node).opacity)<1)return true;
 return false;
 }).map(panel=>panel.className);
 const snapshotAnimations=document.getAnimations().filter(animation=>['route-fade-in','route-fade-out'].includes(animation.animationName)).map(animation=>({name:animation.animationName,progress:animation.effect?.getComputedTiming().progress}));
 frames.push({page:page?.querySelector('h1')?.textContent,panels:panels.length,invalid,snapshotAnimations});
 if(frames.length<45)requestAnimationFrame(sample);
 else output.textContent=JSON.stringify({frames:frames.length,pages:[...new Set(frames.map(frame=>frame.page))],sampledPanels:frames.reduce((sum,frame)=>sum+frame.panels,0),invalidFrames:frames.filter(frame=>frame.invalid.length).length,snapshotFadingFrames:frames.filter(frame=>frame.snapshotAnimations.some(animation=>animation.progress>0&&animation.progress<1)).length,visibility:document.visibilityState,viewTransitionsSupported:typeof document.startViewTransition==='function'});
 };
 output.textContent='sampling';requestAnimationFrame(sample);
 },true);
 });
 if(parent!==window){
 let timer;const report=()=>{
 const page=document.querySelector('.page');if(!page)return;
 const surfaces=[...page.querySelectorAll('.glass-panel,.card')];
 const grids=[...page.querySelectorAll('.home-grid,.champion-layout,.build-columns,.teams-row,.teams-grid')].map(e=>({name:e.className,columns:getComputedStyle(e).gridTemplateColumns}));
 const scroll=[...page.querySelectorAll('.ranking-table-wrap,.participants-list,.skill-table-wrap')].map(e=>({name:e.className,scroll:e.scrollWidth>e.clientWidth+1}));
 const invalid=[...page.querySelectorAll('*')].filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+2&&!e.closest('.ranking-table-wrap,.participants-list,.skill-table-wrap,.cd-content')&&getComputedStyle(e).overflowX==='visible'&&getComputedStyle(e).textOverflow!=='ellipsis').slice(0,8).map(e=>e.className||e.tagName);
 parent.postMessage({kind:'ui-audit',page:page.querySelector('.page-heading h1')?.textContent,viewport:innerWidth,content:Math.round(page.clientWidth),pageOverflow:page.scrollWidth>page.clientWidth+2,glass:surfaces.length,unblurred:surfaces.filter(e=>getComputedStyle(e).backdropFilter==='none').map(e=>e.className),grids,scroll,invalid},location.origin);
 };
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(report,450);};
 addEventListener('load',()=>{new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true});schedule();});addEventListener('resize',schedule);
 }
}
const injection='<script>('+shim.toString()+')('+JSON.stringify(data)+');</script>';
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');const pathname=url.pathname;
 if(pathname==='/showcase'){
 const height=Math.max(768,Math.min(1400,Number(url.searchParams.get('h'))||900));
 const theme=url.searchParams.get('theme')==='light'?'light':'dark';
 const phase=['draft','live'].includes(url.searchParams.get('phase'))?url.searchParams.get('phase'):'';
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8"><title>玻璃材质预览 · 示例数据</title></head><body style="margin:0;width:1280px;min-width:1280px;height:'+height+'px"><iframe title="示例页面" src="/?theme='+theme+'&phase='+phase+'&mode='+(url.searchParams.get('mode')||'')+'" style="width:1280px;height:'+height+'px;border:0;display:block"></iframe></body></html>');return;
 }
 if(pathname==='/audit'){
 const width=Math.max(400,Math.min(1920,Number(url.searchParams.get('w'))||1024));const theme=url.searchParams.get('theme')==='light'?'light':'dark';
 const phase=['draft','live'].includes(url.searchParams.get('phase'))?url.searchParams.get('phase'):'';
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8"><title>布局检查 · 示例数据</title></head><body style="margin:0;background:#dce1ed;font:12px monospace"><iframe title="示例页面" src="/?theme='+theme+'&phase='+phase+'" style="width:'+width+'px;height:900px;border:0;display:block;transform-origin:top left;transform:scale('+Math.min(1,1000/width)+')"></iframe><pre id="audit-report" style="position:fixed;right:0;top:0;width:250px;height:100vh;overflow:auto;white-space:pre-wrap;background:#f6f8ff;margin:0;padding:12px;box-sizing:border-box">等待页面加载…</pre><script>addEventListener("message",event=>{if(event.origin===location.origin&&event.data?.kind==="ui-audit")document.querySelector("#audit-report").textContent=JSON.stringify(event.data,null,2);});</script></body></html>');return;
 }
 const file=path.join(root,pathname==='/'?'index.html':decodeURIComponent(pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
 const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[ext]||'application/octet-stream');
 if(ext==='.html')res.end(fs.readFileSync(file,'utf8').replace('<head>','<head>'+injection));else fs.createReadStream(file).pipe(res);
}).listen(5179,'127.0.0.1',()=>console.log('UI fixture: http://127.0.0.1:5179/audit?w=1024&theme=dark'));
