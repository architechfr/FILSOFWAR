/* FILS OF WAR / Monde 8 - Civilisations V3.
 * Modèle additif : coexiste avec le moteur de combat V2, sans le remplacer.
 * 5 voies de victoire : prospérité, science, culture, diplomatie, conquête.
 * Les règles sont déterministes, les ressources sont réellement dépensées.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.FOW_CIV8=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const ROUTES=[
  {key:'commerce',name:'Prospérité',desc:'Un réseau de marchés et de routes commerciales prospères'},
  {key:'science',name:'Savoir',desc:'Faire progresser les connaissances de la civilisation'},
  {key:'culture',name:'Rayonnement',desc:'Festivals, monuments et découvertes culturelles'},
  {key:'diplomatie',name:'Concorde',desc:'Convaincre les autres royaumes de s’unir pacifiquement'},
  {key:'conquete',name:'Domination',desc:'Étendre son pouvoir par la conquête territoriale'}
 ];
 const COSTS={
  market:{food:0,wood:75,stone:25,gold:0},
  library:{food:0,wood:95,stone:35,gold:0},
  theater:{food:0,wood:105,stone:40,gold:0},
  embassy:{food:0,wood:115,stone:55,gold:10},
  observatory:{food:0,wood:160,stone:90,gold:30},
  monument:{food:0,wood:195,stone:115,gold:45},
  settlement:{food:100,wood:90,stone:35,gold:0}
 };
 const DURATIONS={market:48,library:62,theater:64,embassy:74,observatory:100,monument:145,settlement:82};
 const TECHNOLOGIES=[
  {key:'irrigation',name:'Irrigation',points:70,time:42,cost:{food:25,gold:4}},
  {key:'caravans',name:'Routes marchandes',points:115,time:55,cost:{wood:35,gold:10}},
  {key:'printing',name:'Écriture et imprimerie',points:165,time:65,cost:{stone:40,gold:15}},
  {key:'astronomy',name:'Astronomie',points:220,time:75,cost:{stone:55,gold:20}},
  {key:'electricity',name:'Électricité',points:290,time:88,cost:{stone:70,gold:30}},
  {key:'engines',name:'Moteur moderne',points:360,time:105,cost:{stone:85,gold:40}}
 ];
 const CATEGORIES=['commerce','science','culture','diplomatie','conquete'];
 const TYPE_NAME={market:'Marché',library:'Bibliothèque',theater:'Salle des fêtes',embassy:'Ambassade',
  observatory:'Observatoire',monument:'Grand monument',settlement:'Village libre'};
 const AI_STYLE=['commerce','science','culture','diplomatie','conquete','science','commerce','culture'];
 function copy(v){return JSON.parse(JSON.stringify(v))}
 function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
 function point(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&x>=0&&x<2048&&z>=0&&z<2048}
 function area(id){return id>=0&&id<256&&Number.isInteger(id)}
 function costOK(resources,cost){
  return Object.keys(cost).every(k=>(resources[k]||0)>=cost[k]);
 }
 function debit(resources,cost){
  if(!costOK(resources,cost))return false;
  for(const key of Object.keys(cost))resources[key]-=cost[key];
  return true;
 }
 function neighbours(id){
  const x=id%16,z=Math.floor(id/16),list=[];
  if(x>0)list.push(id-1);
  if(x<15)list.push(id+1);
  if(z>0)list.push(id-16);
  if(z<15)list.push(id+16);
  return list;
 }
 function metrics(s,world,owner,now){
  const me=s.civs[owner],core=s.coreCivs[owner],owned=s.sectors.filter(t=>t.owner===owner);
  const completed=type=>s.projects.filter(b=>b.owner===owner&&b.type===type&&b.complete&&s.sectors[b.sector].owner===owner).length;
  const partners=s.pacts.filter(p=>p.a===owner||p.b===owner).map(p=>p.a===owner?p.b:p.a);
  const supporters=[];
  for(let i=0;i<8;i++)if(i!==owner&&s.coreCivs[i].started&&s.coreCivs[i].alive!==false&&
     s.relations[owner][i]>=72&&(partners.includes(i)||me.prestige>=180))supporters.push(i);
  const foreignCapitals=world.capitals.filter(c=>c.seat!==owner&&s.sectors[c.sector].owner===owner).length;
  return {markets:completed('market'),libraries:completed('library'),theaters:completed('theater'),
   embassies:completed('embassy'),observatories:completed('observatory'),monuments:completed('monument'),
   settlements:completed('settlement'),partners:partners.length,supporters:supporters.length,
   supportersList:supporters,territories:owned.length,foreignCapitals,gold:core.resources.gold,
   age:core.age,elapsed:now,lastConflict:me.lastConflict};
 }
 function evaluate(s,world,owner,now){
  const c=s.civs[owner],m=metrics(s,world,owner,now);
  const gates=[
   {key:'commerce',values:[m.markets/2,c.tradeVolume/330,m.partners/3,m.gold/160]},
   {key:'science',values:[m.libraries/2,m.observatories/1,c.tech.length/4,c.knowledgeEarned/680]},
   {key:'culture',values:[m.theaters/2,m.monuments/1,c.prestige/450,c.festivals/3,c.sites.length/2]},
   {key:'diplomatie',values:[m.embassies/1,m.supporters/4,c.influence/320,(now-c.lastConflict)/180]},
   {key:'conquete',values:[m.territories/64,m.foreignCapitals/2]}
  ];
  return gates.map(g=>{
   const progress=g.values.reduce((a,b)=>a+clamp(Number.isFinite(b)?b:0,0,1),0)/g.values.length;
   const ready=g.values.every(v=>v>=1);
   return {key:g.key,label:ROUTES.find(r=>r.key===g.key).name,progress:Math.round(progress*100),
    ready:ready&&now>=300,requirements:g.values.map(v=>clamp(v,0,1)),minTime:300};
  });
 }
 function enhance(base,opts){
  opts=opts||{};
  if(!base||!base.world||!base.civs||typeof base.save!=='function')
    throw Error('Moteur stratégie V2 requis pour Civilisations V3');
  const world=base.world,owner=base.player;
  const civs=base.civs.map((c,i)=>({
    seat:i,focus:AI_STYLE[i],knowledge:0,knowledgeEarned:0,prestige:0,influence:0,
    tradeVolume:0,festivals:0,sites:[],tech:[],research:null,
    envoyLast:{},festivalLast:-999,aiNext:31+i*5,lastConflict:-999,archived:0
  }));
  const relations=Array.from({length:8},(_,i)=>Array.from({length:8},(_,j)=>
    i===j?100:35+((world.seed+i*17+j*29+Math.min(i,j)*11)%21)));
  // Shared trust must be symmetric for fair diplomacy.
  for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){
    const v=Math.floor((relations[i][j]+relations[j][i])/2);
    relations[i][j]=v;relations[j][i]=v;
  }
  let projects=[],pacts=[],winner=null,nextProject=0,elapsedSecond=0;
  let previousOwners=base.sectors().map(s=>s.owner);
  let exposedScores=[];
  function civState(){
    return {civs,projects,pacts,relations,winner};
  }
  function note(seat,text){
    const ev=base.events();
    ev.unshift({t:Math.floor(base.summary().clock),seat,text});
    ev.length=Math.min(ev.length,45);
  }
  function count(seat,type){
    return projects.filter(p=>p.owner===seat&&p.type===type&&p.complete&&base.sectors()[p.sector].owner===seat).length;
  }
  function buildingOf(seat,type){
    return projects.some(p=>p.owner===seat&&p.type===type&&p.complete&&base.sectors()[p.sector].owner===seat);
  }
  function hasPending(seat,type){
    return projects.some(p=>p.owner===seat&&p.type===type&&!p.complete);
  }
  function canAct(seat){
    return !winner&&Number.isInteger(seat)&&seat>=0&&seat<8&&base.civs[seat].started&&base.civs[seat].alive!==false;
  }
  function build(seat,type,sector){
    if(!canAct(seat))return {ok:false,error:'Royaume indisponible'};
    if(!Object.prototype.hasOwnProperty.call(COSTS,type))return {ok:false,error:'Projet inconnu'};
    if(!area(sector))return {ok:false,error:'Secteur invalide'};
    const lands=base.sectors(),isSettlement=type==='settlement';
    if(isSettlement){
      if(lands[sector].owner!==-1||world.sectors[sector].landRatio<.45)
        return {ok:false,error:'Choisis un secteur neutre constructible'};
      if(!neighbours(sector).some(i=>lands[i].owner===seat))
        return {ok:false,error:'Le nouveau village doit toucher ton territoire'};
    }else if(lands[sector].owner!==seat)return {ok:false,error:'Le secteur ne t’appartient pas'};
    if(projects.some(b=>b.owner===seat&&b.type===type&&b.sector===sector))
      return {ok:false,error:'Un chantier semblable existe ici'};
    if(type==='observatory'&&(!buildingOf(seat,'library')||base.civs[seat].age<2))
      return {ok:false,error:'Il faut une bibliothèque et l’âge II'};
    if(type==='monument'&&(!buildingOf(seat,'theater')||civs[seat].prestige<150))
      return {ok:false,error:'Il faut une salle des fêtes et 150 prestige'};
    if(type==='settlement'&&base.civs[seat].age<2)
      return {ok:false,error:'Il faut atteindre l’âge II pour fonder un village libre'};
    if(!costOK(base.civs[seat].resources,COSTS[type]))
      return {ok:false,error:'Ressources insuffisantes pour ce projet'};
    const spot=world.sectors[sector],pos={x:spot.x,z:spot.z};
    if(!isSettlement&&!world.canTraverse('infanterie',pos.x,pos.z)){
      const c=world.capitals[seat];
      if(sector===c.sector){pos.x=c.x;pos.z=c.z;}
      else return {ok:false,error:'Emplacement non constructible'};
    }
    if(!debit(base.civs[seat].resources,COSTS[type]))throw Error('Coût non débité');
    const project={id:'c'+(++nextProject),owner:seat,type,sector,x:pos.x,z:pos.z,
      duration:DURATIONS[type],progress:0,complete:false};
    projects.push(project);
    note(seat,base.civs[seat].name+' lance '+TYPE_NAME[type]+'.');
    return {ok:true,project:project.id,seconds:project.duration};
  }
  function research(seat){
    if(!canAct(seat))return {ok:false,error:'Royaume indisponible'};
    const c=civs[seat],t=TECHNOLOGIES[c.tech.length];
    if(!t)return {ok:false,error:'Toutes les technologies ont été étudiées'};
    if(c.research)return {ok:false,error:'Une recherche est déjà en cours'};
    if(!buildingOf(seat,'library'))return {ok:false,error:'Construis une bibliothèque'};
    if(c.knowledge<t.points)return {ok:false,error:'Connaissances insuffisantes'};
    if(!costOK(base.civs[seat].resources,t.cost))return {ok:false,error:'Ressources insuffisantes'};
    debit(base.civs[seat].resources,t.cost);c.knowledge-=t.points;
    c.research={key:t.key,name:t.name,remaining:t.time};
    note(seat,base.civs[seat].name+' étudie '+t.name+'.');
    return {ok:true,technology:t.name,seconds:t.time};
  }
  function trade(seat,other){
    if(!canAct(seat)||!canAct(other)||other===seat)return {ok:false,error:'Partenaire indisponible'};
    if(!buildingOf(seat,'market'))return {ok:false,error:'Construis d’abord un marché'};
    if(relations[seat][other]<30)return {ok:false,error:'Relations commerciales insuffisantes'};
    if(pacts.some(p=>(p.a===seat&&p.b===other)||(p.a===other&&p.b===seat)))
      return {ok:false,error:'Une route commerciale existe déjà'};
    const cost={food:25,wood:18,gold:5};
    if(!debit(base.civs[seat].resources,cost))return {ok:false,error:'Ressources insuffisantes'};
    pacts.push({a:Math.min(seat,other),b:Math.max(seat,other),deliveries:0});
    changeTrust(seat,other,9);
    note(seat,base.civs[seat].name+' ouvre une route vers '+base.civs[other].name+'.');
    return {ok:true,partner:other};
  }
  function changeTrust(a,b,d){
    const v=clamp(relations[a][b]+d,0,100);
    relations[a][b]=v;relations[b][a]=v;
  }
  function envoy(seat,other){
    if(!canAct(seat)||!canAct(other)||seat===other)return {ok:false,error:'Royaume indisponible'};
    if(!buildingOf(seat,'embassy'))return {ok:false,error:'Construis une ambassade'};
    if(base.summary().clock-(civs[seat].envoyLast[other]??-999)<48)
      return {ok:false,error:'Les ambassadeurs sont encore en mission'};
    if(!debit(base.civs[seat].resources,{food:25,gold:10}))
      return {ok:false,error:'Vivres ou filsous insuffisants'};
    civs[seat].envoyLast[other]=base.summary().clock;
    civs[seat].influence+=18;
    changeTrust(seat,other,17);
    note(seat,base.civs[seat].name+' envoie des émissaires à '+base.civs[other].name+'.');
    return {ok:true,relation:relations[seat][other]};
  }
  function festival(seat){
    if(!canAct(seat))return {ok:false,error:'Royaume indisponible'};
    const c=civs[seat],now=base.summary().clock;
    if(!buildingOf(seat,'theater'))return {ok:false,error:'Construis une salle des fêtes'};
    if(now-c.festivalLast<60)return {ok:false,error:'Un festival vient déjà d’avoir lieu'};
    if(!debit(base.civs[seat].resources,{food:65,gold:13}))
      return {ok:false,error:'Il manque des vivres ou des filsous'};
    c.festivalLast=now;c.festivals++;c.prestige+=56;c.influence+=24;
    for(let i=0;i<8;i++)if(i!==seat&&base.civs[i].started)changeTrust(seat,i,4);
    note(seat,'Grand Festival des Sales Fils à '+base.civs[seat].name+' !');
    return {ok:true,prestige:c.prestige};
  }
  function decideFocus(seat,route){
    if(!canAct(seat)||!CATEGORIES.includes(route))return {ok:false,error:'Voie inconnue'};
    civs[seat].focus=route;
    return {ok:true,focus:route};
  }
  function tickProjects(dt){
    for(const p of projects){
      if(p.complete)continue;
      const current=base.sectors()[p.sector].owner;
      if((p.type==='settlement'&&current!==-1)||(p.type!=='settlement'&&current!==p.owner))continue;
      const c=world.capitals[p.owner];
      const workers=base.people().filter(u=>u.owner===p.owner&&u.type==='worker'&&u.hp>0&&
        Math.hypot(u.x-p.x,u.z-p.z)<90).length;
      // Les villages éloignés demandent le déplacement réel d'ouvriers.
      if(!workers)continue;
      p.progress=Math.min(1,p.progress+dt*(1+Math.min(workers-1,2)*.30)/p.duration);
      if(p.progress<1)continue;
      p.complete=true;
      if(p.type==='settlement'){
        base.sectors()[p.sector].owner=p.owner;
        note(p.owner,base.civs[p.owner].name+' fonde pacifiquement un village en '+world.sectors[p.sector].label+'.');
      } else note(p.owner,base.civs[p.owner].name+' inaugure '+TYPE_NAME[p.type]+'.');
    }
  }
  function tickCultureScience(dt){
    for(let i=0;i<8;i++){
      const f=base.civs[i],c=civs[i];if(!f.started||f.alive===false)continue;
      const libs=count(i,'library'),observatories=count(i,'observatory'),theaters=count(i,'theater'),
       monuments=count(i,'monument'),embassies=count(i,'embassy');
      const scienceRate=libs*1.6+observatories*2.5,prestigeRate=theaters*1.2+monuments*2.7;
      c.knowledge+=scienceRate*dt;c.knowledgeEarned+=scienceRate*dt;
      c.prestige+=prestigeRate*dt;
      c.influence+=(embassies*.65+monuments*.12)*dt;
      if(c.research){
        c.research.remaining-=dt;
        if(c.research.remaining<=0){
          c.tech.push(c.research.key);
          note(i,f.name+' découvre '+c.research.name+' !');
          c.research=null;
        }
      }
      for(const site of world.landmarks){
        if(c.sites.includes(site.name))continue;
        const seen=base.people().some(u=>u.hp>0&&u.owner===i&&Math.hypot(u.x-site.x,u.z-site.z)<105);
        if(!seen)continue;
        c.sites.push(site.name);c.prestige+=30;c.knowledge+=22;c.knowledgeEarned+=22;
        note(i,f.name+' découvre '+site.name+'.');
      }
    }
  }
  function tickTrade(){
    for(const pact of pacts){
      const a=pact.a,b=pact.b,A=base.civs[a],B=base.civs[b];
      if(!A.started||!B.started||A.alive===false||B.alive===false)continue;
      if(!buildingOf(a,'market')&&!buildingOf(b,'market'))continue;
      const first=pact.deliveries%2===0?a:b,other=first===a?b:a;
      const from=base.civs[first].resources,to=base.civs[other].resources;
      if(from.food<3||from.wood<2)continue;
      from.food-=3;from.wood-=2;
      from.gold+=6;to.gold+=3;to.food+=2;
      civs[first].tradeVolume+=7;civs[other].tradeVolume+=4;
      pact.deliveries++;
      if(pact.deliveries%4===0)changeTrust(a,b,1);
    }
  }
  function observeConflicts(){
    const land=base.sectors();
    for(let k=0;k<256;k++){
      const old=previousOwners[k],now=land[k].owner;
      if(old===now)continue;
      if(old>=0&&now>=0&&old!==now){
        civs[now].lastConflict=base.summary().clock;
        changeTrust(now,old,-15);
        civs[now].influence=Math.max(0,civs[now].influence-20);
      }
      previousOwners[k]=now;
    }
  }
  function aiDecide(seat){
    const c=civs[seat],f=base.civs[seat];if(!canAct(seat)||f.isHuman)return;
    if(projects.filter(p=>p.owner===seat&&!p.complete).length>1)return;
    const home=f.home&&f.home.sector;
    if(home==null)return;
    const targetNeighbours=neighbours(home).filter(id=>base.sectors()[id].owner===-1&&world.sectors[id].landRatio>.5);
    const chooseColonial=()=>f.age>=2&&targetNeighbours.length&&build(seat,'settlement',targetNeighbours[0]).ok;
    function tryBuilding(type){
      if(!buildingOf(seat,type)&&!hasPending(seat,type))return build(seat,type,home).ok;
      return false;
    }
    if(c.focus==='commerce'){
      if(tryBuilding('market'))return;
      if(buildingOf(seat,'market')){
        for(let target=0;target<8;target++)if(target!==seat&&!pacts.some(p=>(p.a===seat&&p.b===target)||(p.b===seat&&p.a===target))){
          if(trade(seat,target).ok)return;
        }
      }
      if(chooseColonial())return;
      if(targetNeighbours.length){const id=targetNeighbours[0];if(build(seat,'settlement',id).ok)return;}
    }else if(c.focus==='science'){
      if(tryBuilding('library'))return;
      if(c.tech.length>=1&&f.age>=2&&tryBuilding('observatory'))return;
      if(!c.research&&research(seat).ok)return;
      if(chooseColonial())return;
    }else if(c.focus==='culture'){
      if(tryBuilding('theater'))return;
      if(c.prestige>=150&&tryBuilding('monument'))return;
      if(base.summary().clock-c.festivalLast>=60&&festival(seat).ok)return;
      if(chooseColonial())return;
    }else if(c.focus==='diplomatie'){
      if(tryBuilding('embassy'))return;
      if(tryBuilding('market'))return;
      for(let target=0;target<8;target++)if(target!==seat&&base.civs[target].started){
        if(!pacts.some(p=>(p.a===seat&&p.b===target)||(p.a===target&&p.b===seat))&&trade(seat,target).ok)return;
        if(relations[seat][target]<76&&envoy(seat,target).ok)return;
      }
      if(chooseColonial())return;
    }else if(c.focus==='conquete'){
      if(tryBuilding('market'))return;
      if(chooseColonial())return;
    }
    if(tryBuilding('market'))return;
  }
  function victoryCheck(now){
    if(winner)return;
    const state={civs,coreCivs:base.civs,sectors:base.sectors(),projects,pacts,relations};
    for(let seat=0;seat<8;seat++){
      if(!canAct(seat))continue;
      const wins=evaluate(state,world,seat,now),first=wins.find(w=>w.ready);
      if(first){
        winner={seat,mode:first.key,name:first.label,at:now};
        note(seat,base.civs[seat].name+' remporte une victoire de '+first.label+' !');
        return;
      }
    }
  }
  function update(delta){
    if(winner)return;
    base.update(delta);
    const current=Math.floor(base.summary().clock+1e-6);
    if(current<elapsedSecond)elapsedSecond=current;
    while(elapsedSecond<current&&!winner){
      elapsedSecond++;
      observeConflicts();
      tickProjects(1);
      tickCultureScience(1);
      if(elapsedSecond%12===0)tickTrade();
      if(opts.ai!==false)for(let i=0;i<8;i++){
        if(i===owner)continue;
        if(base.civs[i].started&&elapsedSecond>=civs[i].aiNext){
          aiDecide(i);civs[i].aiNext=elapsedSecond+24+((i*7+world.seed)%9);
        }
      }
      victoryCheck(elapsedSecond);
    }
  }
  function board(seat){
    const s={civs,coreCivs:base.civs,sectors:base.sectors(),projects,pacts,relations};
    return evaluate(s,world,seat==null?owner:seat,base.summary().clock);
  }
  function summary(){
    const s=base.summary(),c=civs[owner];
    return {...s,knowledge:c.knowledge,knowledgeEarned:c.knowledgeEarned,prestige:c.prestige,
      influence:c.influence,tradeVolume:c.tradeVolume,focus:c.focus,tech:c.tech.slice(),
      sites:c.sites.slice(),victory:winner,goals:board(owner)};
  }
  function save(){
    return JSON.stringify({version:3,seed:world.seed,player:owner,
      core:JSON.parse(base.save()),civilization:{
        civs:copy(civs),projects:copy(projects),pacts:copy(pacts),relations:copy(relations),
        winner:copy(winner),nextProject,elapsedSecond,previousOwners:previousOwners.slice()
      }});
  }
  function load(raw){
    const obj=typeof raw==='string'?JSON.parse(raw):raw;
    if(!obj)throw Error('Sauvegarde vide');
    if(obj.version===3){
      if(obj.seed!==world.seed||obj.player!==owner||!obj.civilization||
       !Array.isArray(obj.civilization.civs)||obj.civilization.civs.length!==8)
        throw Error('Sauvegarde de civilisation incompatible');
      base.load(obj.core);
      const p=obj.civilization;
      for(let i=0;i<8;i++)Object.assign(civs[i],copy(p.civs[i]));
      projects=copy(p.projects||[]);pacts=copy(p.pacts||[]);
      if(p.relations&&p.relations.length===8)for(let i=0;i<8;i++)relations[i]=p.relations[i].slice();
      winner=copy(p.winner);nextProject=p.nextProject||0;elapsedSecond=p.elapsedSecond||0;
      previousOwners=(p.previousOwners||base.sectors().map(s=>s.owner)).slice();
    }else if(obj.version===1||obj.version===2){
      // Migrer sans effacer la partie historique du laboratoire.
      base.load(obj);elapsedSecond=Math.floor(base.summary().clock);previousOwners=base.sectors().map(s=>s.owner);
    }else throw Error('Version de sauvegarde inconnue');
    return true;
  }
  const facade=Object.assign({},base,{
    update,save,load,summary,
    civilization:function(){
      return {civs:copy(civs),projects:copy(projects),pacts:copy(pacts),
        relations:copy(relations),winner:copy(winner)};
    },
    buildCivic:function(type,sector){return build(owner,type,sector);},
    startResearch:function(){return research(owner);},
    openTrade:function(other){return trade(owner,other);},
    sendEnvoy:function(other){return envoy(owner,other);},
    holdFestival:function(){return festival(owner);},
    chooseFocus:function(kind){return decideFocus(owner,kind);},
    routes:function(){return board(owner);},
    victory:function(){return winner?copy(winner):null},
    details:function(seat){const s={civs,coreCivs:base.civs,sectors:base.sectors(),projects,pacts,relations};
      return metrics(s,world,seat==null?owner:seat,base.summary().clock);}
  });
  return facade;
 }
 return Object.freeze({VERSION:3,ROUTES,COSTS,DURATIONS,TECHNOLOGIES,TYPE_NAME,
  evaluate,metrics,enhance});
});
