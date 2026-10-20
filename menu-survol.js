/* FILS OF WAR - le survol de la vraie carte derrière le menu (20/10/2026).
 * Florian : « le continent 3D n'est pas identique à la map jouable ». On ne montre donc plus
 * qu'une seule terre : celle où l'on joue. Derrière le menu, la caméra survole lentement la
 * carte de la partie (Salagou, Pont du Diable, Campagnan, Pic Saint-Loup, Sète, Cap d'Agde),
 * brouillard levé pour l'image seulement : le brouillard de la partie n'est jamais touché.
 */
(function(){
  'use strict';
  var actif=false,etape=0,t=0,dernier=0,ancienFog=null,vue=null,taille=null;

  function menuVisible(){var m=document.getElementById('menu');return !!(m&&!m.hidden);}
  function points(){
    var G=window.FOW_GEO_PLAYABLE;if(!G||!G.byId)return [];
    var P=[],B=G.byId;
    function ajoute(o,nom){if(o&&typeof o.x==='number')P.push({x:o.x,z:o.z,nom:nom});}
    ajoute(B.salagou,'Lac du Salagou');
    if(G.ponts&&G.ponts[0])ajoute(G.ponts[0],'Pont du Diable');
    ajoute(B.campagnan,'Campagnan');
    if(G.pic)ajoute(G.pic,'Pic Saint-Loup');
    if(G.sete)ajoute({x:G.sete.x,z:G.sete.z-30},'Sète');
    ajoute(B['cap-agde'],'Cap d’Agde');
    ajoute(B.pezenas,'Pézenas');
    return P;
  }
  function lisse(a){return a*a*(3-2*a);}

  function brancher(v){
    if(vue===v)return;vue=v;ancienFog=v._fog;
    v._fog=function(dt){
      if(actif){
        if(!this.__fowMenuClair){
          this.fogData.fill(255);this.fogTexture.needsUpdate=true;this.__fowMenuClair=true;
        }
        // on ne prepare que les morceaux de carte autour de la camera
        var c=this.center,cx=Math.floor(c.x/64),cz=Math.floor(c.z/64),cols=Math.ceil(768/64);
        for(var dz=-2;dz<=2;dz++)for(var dx=-2;dx<=2;dx++){var X=cx+dx,Z=cz+dz;if(X>=0&&Z>=0&&X<cols&&Z<cols)this.knownChunks.add(Z*cols+X);}
        return;
      }
      if(this.__fowMenuClair){this.__fowMenuClair=false;this.lastFogRevision=NaN;}
      return ancienFog.call(this,dt);
    };
  }

  function boucle(now){
    requestAnimationFrame(boucle);
    var F=window.__FOW__,v=F&&F.view;
    if(!v||!v.focus)return;
    brancher(v);
    var doit=menuVisible();
    if(doit&&!actif){actif=true;t=0;etape=0;dernier=now;taille=v.getCameraState().size;if(v.zoom)v.zoom(Math.min(1.4,58/Math.max(1,taille)));}
    if(!doit&&actif){actif=false;if(v.zoom&&taille)v.zoom(taille/Math.max(1,v.getCameraState().size));var g=F.game,h=g&&(g._home&&g._home(window.FOW_ME||0)||g.units&&g.units.find(function(u){return u.owner===0;}));if(h)v.focus(h.x,h.z);return;}
    if(!actif)return;
    var P=points();if(P.length<2)return;
    var dt=Math.min(.1,(now-dernier)/1000);dernier=now;t+=dt/11;
    if(t>=1){t=0;etape=(etape+1)%P.length;}
    var a=P[etape],b=P[(etape+1)%P.length],k=lisse(t);
    v.focus(a.x+(b.x-a.x)*k,a.z+(b.z-a.z)*k);
    var lieu=document.getElementById('fow-survol-lieu');
    if(lieu){var nom=(k<.5?a:b).nom;if(lieu.textContent!==nom)lieu.textContent=nom;}
  }
  function demarrer(){
    var titre=document.querySelector('.map-title');
    if(titre&&!document.getElementById('fow-survol-lieu')){
      var s=document.createElement('div');s.id='fow-survol-lieu';
      s.style.cssText='font:italic 15px Georgia,serif;color:#e4d5b9;margin:-14px 0 18px;letter-spacing:1px;text-shadow:0 2px 6px #000';
      var p=titre.querySelector('p');if(p&&p.nextSibling)titre.insertBefore(s,p.nextSibling);else titre.appendChild(s);
    }
    requestAnimationFrame(boucle);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',demarrer);else demarrer();
})();
