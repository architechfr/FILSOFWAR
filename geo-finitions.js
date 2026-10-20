/* FILS OF WAR - finitions de la carte nord-sud (20/10/2026).
 * Derniere couche, chargee apres toutes les autres : rien ne pousse dans la mer,
 * ni dans le fleuve, et la plage reste du sable (pas d'arbre ni de gisement dessus).
 * Deterministe : on retire, on n'ajoute rien, dans le meme ordre sur les deux telephones.
 */
(function(){
  'use strict';
  var carte=window.FOW_CARTE,G=window.FOW_GEO_PLAYABLE;
  if(!carte||!G||!G.nordSud||carte.geoFinitions)return;
  var originalPeupler=carte.peupler,originalDecor=carte.decor;

  function mouille(x,z,marge){return G.isSea(x,z)||G.riverDist(x,z)<G.riverHalfWidth+(marge||0);}
  function surSable(x,z){return G.isBeach(x,z);}

  carte.peupler=function(game,api){
    originalPeupler.call(this,game,api);
    window.__fowSecteursMoteur=api.SECTORS||[];
    // Les gisements poses par les couches precedentes sur la plage ou dans l'eau sont retires.
    var garde=[],retires=0;
    for(var i=0;i<game.nodes.length;i++){
      var n=game.nodes[i];
      if(mouille(n.x,n.z,(n.radius||1)+.5)||surSable(n.x,n.z)){retires++;if(game._entities&&game._entities.delete)game._entities.delete(n.id);continue;}
      garde.push(n);
    }
    game.nodes.length=0;for(var j=0;j<garde.length;j++)game.nodes.push(garde[j]);
    game.fowFinitions={gisementsRetires:retires,bancs:poserBancs(game,api)};
  };

  // 20/10 : les bancs de poissons, au bord du fleuve, des lacs et de la mer.
  // On ne les peche qu'avec une cabane de pecheur toute proche.
  function poserBancs(game,api){
    var S=api.SECTORS||[],poses=0,P=G.ponts||[];
    function secteur(x,z){var b=S[0],bd=1e9;for(var i=0;i<S.length;i++){var dx=x-S[i].x,dz=z-S[i].z,d=dx*dx+dz*dz;if(d<bd){bd=d;b=S[i];}}return b;}
    function libre(x,z){
      if(x<14||z<14||x>754||z>754)return false;
      if(api.terrainAt(x,z)!=='land')return false;
      for(var i=0;i<P.length;i++){var a=x-P[i].x,b=z-P[i].z;if(a*a+b*b<28*28)return false;}
      for(var j=0;j<S.length;j++){var c=x-S[j].x,d=z-S[j].z;if(c*c+d*d<30*30)return false;}
      for(var k=0;k<game.nodes.length;k++){var n=game.nodes[k],e=x-n.x,f=z-n.z,m=(n.radius||1)+4;if(e*e+f*f<m*m)return false;}
      return true;
    }
    function poser(x,z){if(!libre(x,z))return false;api.addNode('food',x,z,420,1.8,'fish',secteur(x,z).id);poses++;return true;}
    // le long de l'Herault, une rive puis l'autre
    var cote=1;
    for(var z=34;z<G.coastZ(G.riverX(700))-20;z+=36){
      var rx=G.riverX(z),sl=G.riverSlope(z),l=Math.sqrt(1+sl*sl),off=G.riverHalfWidth+3.6;
      for(var essai=0;essai<2;essai++){var sg=essai?-cote:cote;if(poser(rx+sg*off/l,z-sg*off*sl/l))break;}
      cote=-cote;
    }
    // sur la plage, face a la mer
    for(var x=40;x<740;x+=58){var cz=G.coastZ(x);if(G.riverDist(x,cz)<30)continue;poser(x,cz-4);}
    // autour des lacs (et du Salagou), trois places au plus par lac
    var R=game.reliefs||[];
    for(var r=0;r<R.length;r++){
      var L=R[r];if(L.t!=='lac'||/Ruisseau/.test(L.nom||''))continue;
      var C=L.c[0],mis=0,max=L.nom==='Lac du Salagou'?4:2;
      for(var a=0;a<16&&mis<max;a++){
        var ang=a*Math.PI/8;
        for(var dd=0;dd<14;dd+=1.5){
          var px=C[0]+Math.cos(ang)*(C[2]+dd),pz=C[1]+Math.sin(ang)*(C[2]+dd);
          if(api.terrainAt(px,pz)!=='land')continue;
          if(poser(px+Math.cos(ang)*2,pz+Math.sin(ang)*2)){mis++;a+=3;}
          break;
        }
      }
    }
    return poses;
  }

  // 20/10 : le bocage. Les grandes prairies et les vallees recoivent des haies, des bosquets
  // et des chaos de rochers : on ne marche plus sur une pelouse uniforme. Decor seul, sans collision.
  function h32(a,b,c){var h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul(c|0,1274126177);h=Math.imul(h^(h>>>13),1103515245);return ((h^(h>>>16))>>>0)/4294967296;}
  function bocage(out,col,row){
    var g=carte.courant;if(!g||!g.terroirs)return;
    var x0=col*64,z0=row*64,cx=x0+32,cz=z0+32;
    var seed=(g.seed|0)^0x5eed,k=0;function r(){return h32(col*7+k++,row*13,seed);}
    function libre(x,z,marge){
      if(x<6||z<6||x>762||z>762)return false;
      if(G.isSea(x,z)||G.isBeach(x,z)||G.riverDist(x,z)<9)return false;
      var ix=Math.floor(x/2),iz=Math.floor(z/2);if(g.obstacles&&g.obstacles[iz*384+ix])return false;
      var sec=window.__fowSecteursMoteur||[];for(var i=0;i<sec.length;i++){var dx=x-sec[i].x,dz=z-sec[i].z;if(dx*dx+dz*dz<(marge||40)*(marge||40))return false;}
      for(var j=0;j<g.nodes.length;j++){var n=g.nodes[j],ex=x-n.x,ez=z-n.z,m=(n.radius||1)+2;if(ex*ex+ez*ez<m*m)return false;}
      return true;
    }
    out.vignes=out.vignes||[];out.vignesSol=out.vignesSol||[];out.cypres=out.cypres||[];out.parasolT=out.parasolT||[];out.parasolC=out.parasolC||[];
    // 20/10 lot H : les pins parasols du littoral
    var cote=G.coastZ?G.coastZ(cx):9999;
    if(cz>cote-110&&cz<cote+10){
      var np=3+Math.floor(r()*5);
      for(var pp=0;pp<np;pp++){var px=x0+4+r()*56,pz=z0+4+r()*56;if(!libre(px,pz,44))continue;var ph=4.2+r()*2.4,py=carte.h(px,pz),pc=2+r()*1.2;
        out.parasolT.push({x:px,y:py+ph*.36,z:pz,sx:.17,sy:ph*.72,sz:.17,rz:(r()-.5)*.25,rx:(r()-.5)*.25});
        out.parasolC.push({x:px,y:py+ph*.78,z:pz,sx:pc,sy:.62+r()*.25,sz:pc*(.85+r()*.3),ry:r()*6.28});}
    }
    var herbe=carte.herbe?carte.herbe(cx,cz,g):.6;if(herbe<.5)return; // causses et ruffes : leur propre decor
    // 20/10 lot H : les vignes de Campagnan, en rangs, sur un sol de terre
    if(r()<.34){
      var vx=x0+10+r()*30,vz=z0+10+r()*30,va=r()<.5?0:Math.PI/2+(r()-.5)*.3,vL=14+r()*12,vW=10+r()*8,ux2=Math.cos(va),uz2=Math.sin(va),wx=-uz2,wz=ux2,rang=0,automne=r()<.5;
      for(var off=0;off<=vW;off+=1.7,rang++){
        var ok=0;
        for(var dl=0;dl<=vL;dl+=1.05){var X=vx+ux2*dl+wx*off,Z=vz+uz2*dl+wz*off;if(!libre(X,Z,40))continue;var Y=carte.h(X,Z);ok++;
          out.vignes.push({x:X,y:Y+.32,z:Z,sx:.42+r()*.12,sy:.38+r()*.1,sz:.42+r()*.12,ry:r()*6.28,jaune:automne&&r()<.45});}
        if(ok>3){var mx=vx+ux2*vL/2+wx*off,mz=vz+uz2*vL/2+wz*off;out.vignesSol.push({x:mx,y:carte.h(mx,mz)+.03,z:mz,sx:1.05,sy:.05,sz:vL+1,ry:-va+Math.PI/2});}
      }
    }
    // 20/10 lot H : les cypres, en alignement le long d'une haie ou pres d'un mas
    if(r()<.4){
      var ax2=x0+8+r()*48,az2=z0+8+r()*48,aa=r()*Math.PI,n2=2+Math.floor(r()*4);
      for(var c2=0;c2<n2;c2++){var X2=ax2+Math.cos(aa)*c2*2.3,Z2=az2+Math.sin(aa)*c2*2.3;if(!libre(X2,Z2,40))continue;var hc=4.4+r()*2.4,Y2=carte.h(X2,Z2);
        out.cypres.push({x:X2,y:Y2+hc/2,z:Z2,sx:.55+r()*.15,sy:hc,sz:.55+r()*.15});}
    }
    // une ou deux haies, faites de buissons serres le long d'une ligne
    var nh=r()<.75?(r()<.4?2:1):0;
    for(var hh=0;hh<nh;hh++){
      var ax=x0+6+r()*52,az=z0+6+r()*52,ang=r()*Math.PI,L=16+r()*22,ux=Math.cos(ang),uz=Math.sin(ang);
      for(var d=-L/2;d<=L/2;d+=1.15){
        var x=ax+ux*d+(r()-.5)*.5,z=az+uz*d+(r()-.5)*.5;if(!libre(x,z))continue;
        var y=carte.h(x,z);out.buissons.push({x:x,y:y+.32,z:z,sx:.55+r()*.35,sy:.42+r()*.3,sz:.55+r()*.35});
      }
    }
    // un chaos de rochers ou un bosquet de buissons ronds
    if(r()<.45){
      var bx=x0+8+r()*48,bz=z0+8+r()*48,nb=4+Math.floor(r()*4);
      for(var q=0;q<nb;q++){var x2=bx+(r()-.5)*7,z2=bz+(r()-.5)*7;if(!libre(x2,z2,26))continue;var y2=carte.h(x2,z2);
        if(r()<.5)out.rochers.push({x:x2,y:y2-.05,z:z2,sx:.5+r()*1.1,sy:.35+r()*.7,sz:.5+r()*1.1,ry:r()*6.28});
        else out.buissons.push({x:x2,y:y2+.4,z:z2,sx:.8+r()*.5,sy:.6+r()*.4,sz:.8+r()*.5});}
    }
  }
  carte.decor=function(col,row){
    var out=originalDecor.call(this,col,row);
    function filtre(liste,sableOk){
      if(!liste||!liste.length)return liste;
      var res=[];
      for(var i=0;i<liste.length;i++){var t=liste[i];if(mouille(t.x,t.z,1.2))continue;if(!sableOk&&surSable(t.x,t.z))continue;res.push(t);}
      return res;
    }
    out.arbres=filtre(out.arbres,false);
    out.buissons=filtre(out.buissons,false);
    out.roseaux=filtre(out.roseaux,false);
    out.nenuphars=filtre(out.nenuphars,false);
    out.rochers=filtre(out.rochers,true);
    bocage(out,col,row);
    return out;
  };
  carte.geoFinitions=true;
})();
