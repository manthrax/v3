
define( function() {
	return {
		ObjectPool:function(allocator)
		{
			return{
				allocator: allocator,
				freeList:null,
				activeList:null,
				byId:{},
				add:function(elem){
					elem.next=this.activeList;
					this.activeList=elem;
					elem.active=true;
					if(elem.id)
						this.byId[elem.id]=elem;
				},
				allocate:function(){
					var e=this.freeList;
					if(e!=null){
						this.freeList=e.next;
					}else{
						e=allocator();                
					}
					this.add(e);
					return e;
				},
				
				updateActive:function (updater){
					var elem=this.activeList;
					var prv=null;
					while(elem!=null){
						if(elem.active)
							updater.update(elem);
						if(elem.active==false){
							var nxt=elem.next;
							if(elem.id) delete this.byId[elem.id];
							elem.next=this.freeList;
							this.freeList=elem;
							if(prv==null)this.activeList=nxt;
							else prv.next=nxt;
							elem=nxt;
						}else{
							prv=elem;
							elem=elem.next;
						}
					}
				}
			}
		}
	}
});
