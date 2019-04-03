function go({resolution=10,cleanInterval=5000,splitResolution=500,minSplits=4}={}) {
	
	let nowish = require('nowish')()	

	
	let masters={}
	let hasCleared=0
	let hasAdded=0
	const tick = intervals=>{
		let now = nowish()
		let errors = []
		for (let i=0;i<intervals.length;i++){
			const v = intervals[i]
			if (!v) {
				//do nothing
			} else {
				
				if (v.start > now) {
					continue
				}
				v.start=0
				if (--v.wait > 0) {
					continue
				}
				if (v.cleared) {
					
					throw new Error('a cleared timeout should not be here')
				}
				if (v.limit){
					if (v.count>=v.limit){
						clearLooseInterval(v)	
						continue
					}
					else
						v.count++
				}
				try {
					v.f(...v.options)
				} catch (e) {
					errors.push(e)
				}
				v.wait = v.splits		
			}
		}
		if (errors.length) {
			let e = new Error('LooseTimeoutErrors have occurred')
			e.errors = errors
			throw e
		}
		
	}

	const snap = n=>resolution * Math.round(n/resolution)


	const  setLooseInterval = (f,t,limit,...options)=>{

		t = snap(t)

		const now = nowish()
		if (typeof f !=='function') {
			
			throw new Error('must be func')
		}
		const splits =Math.max(minSplits,Math.ceil(t/splitResolution))
		const splitTime = Math.round(t/splits)
		const key = splitTime
		let master = masters[key]
		if (!master) {
			master = masters[key] = {intervals:[],t,count:1,key,f:tick}
			master.intervalHandle = setInterval(()=>master.f(master.intervals),splitTime)
		} else {
			master.count++
		}
		
		
		let v
		master.intervals.push(v = {wait:0,splits,loose:true,start:now+t,index: master.intervals.length, master, f, options, limit: limit || 0, count: limit ? 0 : undefined})
		
		  
		hasAdded++

		return v
	}

	const setLooseTimeout  = (f,t,...options)=>{
		return setLooseInterval(f,t,1,...options)
	}

	const clearLooseInterval = v=>{
		if (!v || v.cleared)
			return
		
		v.master.intervals[v.index]=undefined
		v.master.count--
		if (v.master.count<1) {
			masters[v.master.key]=undefined
			v.master.f = ()=>{throw new Error('this master should not be called again')}
			clearInterval(v.master.intervalHandle)
		}
		hasCleared++
		v.cleared=true
	}

	setInterval(() => {
		
		if (hasCleared==0 || hasCleared/hasAdded < 0.5) {
			
			return
		}

		//clean up empty entries in intervals
		

		const masters2={}
		let a = 0
		let b = 0
		for (const key in masters){
			let master = masters[key]
			if (master) {
				masters2[key] = master
				let intervals=[]
				for (const interval of master.intervals){
					if (interval){
						interval.index = intervals.length
						intervals.push(interval)
					}
				}
				master.intervals = intervals
			}
		}

		masters = masters2

		hasAdded-=hasCleared
		hasCleared=0

	},cleanInterval)

	return {
		setLooseTimeout,
		setLooseInterval,
		clearLooseInterval,
		clearLooseTimeout:clearLooseInterval,
	}
}

let filled
go.fill = options=>{
	if (filled)
		return
	filled=true
	let funcs = go(options)
	for (let key in funcs) {
		global[key] = funcs[key]
	}
	let oldClearTimeout = clearTimeout
	let oldClearInterval = clearInterval
	
	//can clear either
	global.clearTimeout = (t,...args)=>{
		if (t && t.loose)
			return clearLooseTimeout(t,...args)
		return oldClearTimeout(t,...args)
	}
	global.clearInterval = (t,...args)=>{
		if (t && t.loose)
			return clearLooseInterval(t,...args)
		return oldClearInterval(t,...args)
	}
}
module.exports = go
