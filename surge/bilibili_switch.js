/***********************************************
> 应用名称：墨鱼自用B站换区脚本
> 脚本作者：@nobyda, @ddgksf2013
> 微信账号：墨鱼手记
> 更新时间：2022-04-08
> 通知频道：https://t.me/ddgksf2021
> 贡献投稿：https://t.me/ddgksf2013_bot
> 问题反馈：ddgksf2013@163.com
***********************************************/	


let $ = nobyda();
let run = EnvInfo();

async function SwitchRegion(title, url, body) {
	const Group = $.read('BiliArea_Policy') || 'Bilibili'; //Your blibli policy group name.
	const CN = $.read('BiliArea_CN') || 'DIRECT'; //Your China sub-policy name.
	const TW = $.read('BiliArea_TW') || 'TW'; //Your Taiwan sub-policy name.
	const HK = $.read('BiliArea_HK') || 'HK'; //Your HongKong sub-policy name.
	const DF = $.read('BiliArea_DF') || 'DIRECT'; //Sub-policy name used after region is blocked(e.g. url 404)
	const off = $.read('BiliArea_disabled') || ''; //WiFi blacklist(disable region change), separated by commas.
	const current = await $.getPolicy(Group);
	const area = (() => {
		let select = {};
		let chtMatch = title && title.split('').some(v => zhHans().includes(v));
		if (/\u6e2f[\u4e00-\u9fa5]+\u5340|%20%E6%B8%AF&/.test(title || url)) {
			const test = /\u53f0[\u4e00-\u9fa5]+\u5340/.test(title);
			if (current != HK && (current == TW && test ? 0 : 1))
				select = { policy: HK, mode: '香港' };
		} else if (/\u53f0[\u4e00-\u9fa5]+\u5340|%20%E5%8F%B0&/.test(title || url)) {
			if (current != TW) select = { policy: TW, mode: '台湾' };
		} else if (body.code === -404 || chtMatch) {
			if (current != DF) select = { policy: DIRECT, mode: '后备' };
		} else if (current != CN) {
			select = { policy: CN, mode: '直连' };
		}
		if ($.isQuanX && current === 'direct' && select.policy === 'DIRECT') {
			select = {}; //prevent loopback in some cases
		}
		return select;
	})()

	if (area.policy && !off.includes($.ssid || undefined)) {
		const change = await $.setPolicy(Group, area.policy);
		const msg = (() => {
			if (change && typeof current !== 'number') {
				return `${current} ➤ ${area.policy}`;
			} else if (current === 2) {
				return `策略组名未填写或填写有误 ⚠️`
			} else if (current === 3) {
				return `不支持您的VPN应用版本 ⚠️`
			} else if (change === 0) {
				return `子策略名未填写或填写有误 ⚠️`
			} else {
				return `未知错误 ⚠️`
			}
		})()
		if ($.read('BiliAreaNotify') === 'true') {
			console.log(`${title || ''}\n模式: 策略组使用"${area.mode}"子策略\n走向: ${msg}`);
		} else {
			$.notify(title || '', ``, `模式: 策略组使用"${area.mode}"子策略\n走向: ${msg}`);
		}
		if (change) {
			return true;
		}
	}
	return false;
}

function EnvInfo(){let e=$request.url;if("undefined"!=typeof $response){let t=JSON.parse($response.body||"{}"),l=t.data||t.result||{};t.data&&(["activity_tab","activity_entrance","payment","commodity_rec"].forEach(e=>{delete t.data[e]}),t.data.modules&&(t.data.modules=t.data.modules.filter(e=>"pugv"!=e.style)));let a=[l.title,l.series&&l.series.series_title,l.season_title].filter(e=>/\u5340\uff09/.test(e))[0]||l.title;SwitchRegion(a,null,t).then(()=>$done({body:JSON.stringify(t)}))}else{let i={url:e.replace(/%20(%E6%B8%AF|%E5%8F%B0|%E4%B8%AD)&/g,"&")};SwitchRegion(null,e,{}).then(()=>$done(i))}}

function nobyda() {
	const isHTTP = typeof $httpClient != "undefined";
	const isLoon = typeof $loon != "undefined";
	const isQuanX = typeof $task != "undefined";
	const isSurge = typeof $network != "undefined" && typeof $script != "undefined";
	const ssid = (() => {
		if (isQuanX && typeof ($environment) !== 'undefined') {
			return $environment.ssid;
		}
		if (isSurge && $network.wifi) {
			return $network.wifi.ssid;
		}
		if (isLoon) {
			return JSON.parse($config.getConfig()).ssid;
		}
	})();
	const notify = (title, subtitle, message) => {
		console.log(`${title}\n${subtitle}\n${message}`);
		if (isQuanX) $notify(title, subtitle, message);
		if (isHTTP) $notification.post(title, subtitle, message);
	}
	const read = (key) => {
		if (isQuanX) return $prefs.valueForKey(key);
		if (isHTTP) return $persistentStore.read(key);
	}
	const adapterStatus = (response) => {
		if (!response) return null;
		if (response.status) {
			response["statusCode"] = response.status;
		} else if (response.statusCode) {
			response["status"] = response.statusCode;
		}
		return response;
	}
	const getPolicy = (groupName) => {
		if (isSurge) {
			if (typeof ($httpAPI) === 'undefined') return 3;
			return new Promise((resolve) => {
				$httpAPI("GET", "v1/policy_groups/select", {
					group_name: encodeURIComponent(groupName)
				}, (b) => resolve(b.policy || 2))
			})
		}
		if (isLoon) {
			if (typeof ($config.getPolicy) === 'undefined') return 3;
			const getName = $config.getPolicy(groupName);
			return getName || 2;
		}
		if (isQuanX) {
			if (typeof ($configuration) === 'undefined') return 3;
			return new Promise((resolve) => {
				$configuration.sendMessage({
					action: "get_policy_state"
				}).then(b => {
					if (b.ret && b.ret[groupName]) {
						resolve(b.ret[groupName][1]);
					} else resolve(2);
				}, () => resolve());
			})
		}
	}
	const setPolicy = (group, policy) => {
		if (isSurge && typeof ($httpAPI) !== 'undefined') {
			return new Promise((resolve) => {
				$httpAPI("POST", "v1/policy_groups/select", {
					group_name: group,
					policy: policy
				}, (b) => resolve(!b.error || 0))
			})
		}
		if (isLoon && typeof ($config.getPolicy) !== 'undefined') {
			const set = $config.setSelectPolicy(group, policy);
			return set || 0;
		}
		if (isQuanX && typeof ($configuration) !== 'undefined') {
			return new Promise((resolve) => {
				$configuration.sendMessage({
					action: "set_policy_state",
					content: {
						[group]: policy
					}
				}).then((b) => resolve(!b.error || 0), () => resolve());
			})
		}
	}
	const get = (options, callback) => {
		if (isQuanX) {
			options["method"] = "GET";
			$task.fetch(options).then(response => {
				callback(null, adapterStatus(response), response.body)
			}, reason => callback(reason.error, null, null))
		}
		if (isHTTP) {
			if (isSurge) options.headers['X-Surge-Skip-Scripting'] = false;
			$httpClient.get(options, (error, response, body) => {
				callback(error, adapterStatus(response), body)
			})
		}
	}
	return {
		getPolicy,
		setPolicy,
		isSurge,
		isQuanX,
		isLoon,
		notify,
		read,
		ssid,
		get
	}
}
