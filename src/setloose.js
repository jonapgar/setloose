module.exports = function(threshold){
	
	threshold = threshold || 0.1

	var timeouts={},intervals={},tempo=0,masterIndex,next=0,now=Date.now(),index=0;


	function master(){
		chrono();
		run()
		
	}

	function one(){
		run();
	}

	function run(){
		
		for (var i in timeouts)
			var timeout = timeouts[i];
			if (timeout.next < now) {
				timeout.f.call(timeout.context);
				timeouts[i]=undefined;
			}
		}
		for (var i in intervals)
			var interval = intervals[i];
			if (interval.next < now) {
				interval.f.call(interval.context);
				interval.next+=snap(interval.t);
			}
		}
	}

	function chrono(){
		now = previous + tempo;
		next = now + tempo;
		previous = now;
	}

	function gcd(a,b) {
	    if (b > a) {var temp = a; a = b; b = temp;}
	    while (true) {
	        if (b == 0) return a;
	        a %= b;
	        if (a == 0) return b;
	        b %= a;
	    }
	}

	function snap(n){
		return tempo * Math.max(1,Math.round(n/tempo));
	}
	function setTempo(t,timeout){
		if (tempo==0) return pushTempo(t)
		if (tempo==t) return tempo;

		var snapped = snap(t);
		if ((snappped > t ? snapped/t:t/snapped) < threshold) return tempo;

		
		
		var denom = Math.round(gcd(Math.round(t*threshold),Math.round(tempo*threshold))/threshold);

		return denom==tempo ? tempo:pushTempo(denom);
		
		
	}

	function pushTempo(t){
		clearInterval(masterIndex);
		var rightNow = Date.now();
		var diff = next-now;
		if (diff > 0 && diff < t/2){
			now=next;
			setTimeout(one,diff)
		}
		next=rightNow+t;
		previous = rightNow;
		var masterIndex = setInterval(master,t);
		return tempo=t;
	}

	function setLooseTimeout(f,t,context,args){
		setTempo(t,true)
		var p = {f:f,t:t,next:Date.now()+t,context:context || this,args:args || []}
		return timeouts[index++]=p	
	}

	function setLooseInterval(f,t,context,args){
		setTempo(t)
		var p = {f:f,t:t,next:Date.now()+t,context:context || this,args:args || []}
		return intervals[index++]=p	
	}

	function clearLooseTimeout(i){
		delete timeouts[i];
	}

	function clearLooseInterval(i){
		delete intervals[i];	
	}

	return {

		setLooseTimeout:setLooseTimeout,
		setLooseInterval:setLooseInterval,
		clearLooseTimeout:clearLooseTimeout,
		clearLooseInterval:clearLooseInterval
	}
}