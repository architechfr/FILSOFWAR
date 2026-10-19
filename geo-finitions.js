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
    // Les gisements poses par les couches precedentes sur la plage ou dans l'eau sont retires.
    var garde=[],retires=0;
    for(var i=0;i<game.nodes.length;i++){
      var n=game.nodes[i];
      if(mouille(n.x,n.z,(n.radius||1)+.5)||surSable(n.x,n.z)){retires++;if(game._entities&&game._entities.delete)game._entities.delete(n.id);continue;}
      garde.push(n);
    }
    game.nodes.length=0;for(var j=0;j<garde.length;j++)game.nodes.push(garde[j]);
    game.fowFinitions={gisementsRetires:retires};
  };

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
    return out;
  };
  carte.geoFinitions=true;
})();
