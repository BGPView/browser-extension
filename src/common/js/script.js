KangoAPI.onReady(function() {
	var debug = true;
	var dataHistory = [];
	kango.browser.tabs.getCurrent(function (tab) {
		start(tab.getUrl(), false);
	});
	var start = function (fullUrl, parsed, skipHistroySave) {
		log('Starting the JS process + cleanup...');
		jQuery('.tab-content').text('');
		jQuery('.nav-tabs').text('');
		jQuery('#records-tab').text('');
		jQuery('.current-input').hide();
		jQuery('.base-domain').hide();
		jQuery('.more-info').hide();
		jQuery('.back-btn').hide();
		jQuery('.loader').show();
		log('Current input URL: ' + fullUrl);
		if (parsed === true) {
			var hostname = fullUrl;
		} else {
			var hostname = getDomain(fullUrl);
		}
		// Add item to history array
		if (skipHistroySave !== true && dataHistory[dataHistory.length - 1] !== hostname) {
			dataHistory.push(hostname);
		}
		if (validIP(hostname)) {
			log('hostname is an IP address');
			getAdressInfo(hostname);
		} else if (validPrefix(hostname)) {
			log('hostname is a prefix');
			getPrefixInfo(hostname);
		} else if (validAsn(hostname)) {
			log('hostname is a ASN');
			getAsnInfo(hostname);
		} else {
			log('hostname is a domain');
			getDnsRecords(hostname);
		}
	}
	var log = function (message) {
		if (debug) {
			kango.console.log(message);
		}
	}
	var displayDate = function (date) {
		return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
	}
	var validIP = function (ipAddress) {
		var expression = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))/;
		if (expression.test(ipAddress)) {
			return true;
		} else {
			return false;
		}
	}
	var validAsn = function(asn) {
		var asn = asn.toLowerCase().replace('as', '');
		if (asn % 1 !== 0) {
			return false;
		}
		return true;
	}
	var validPrefix = function (prefix) {
		var parts = prefix.split('/');
		// Need to have only 2 parts
		if (parts.length !== 2) {
			return false;
		}
		// Second part must be an a number
		if (parts[1] % 1 !== 0) {
			return false;
		}
		// Check first part is a valid IP
		return validIP(parts[0]);
	}
	var postLoadIconDisplay = function () {
		jQuery('.loader').hide();
		// Hide back button when there is no history
		if (dataHistory.length > 1) {
			jQuery('.back-btn').show();
		} else {
			jQuery('.back-btn').hide();
		}
	}
	var humanFileSize = function (bits) {
		var thresh = 1000;
		if(Math.abs(bits) < thresh) {
			return bits + ' Mbps';
		}
		var units = ['Gbps','Tbps','Pbps','Ebps'];
		var u = -1;
		do {
			bits /= thresh;
			++u;
		} while(Math.abs(bits) >= thresh && u < units.length - 1);
		return Math.floor(bits.toFixed(1)) +' '+units[u];
	}
	var abort = function () {
		log('Sending an abort');
		postLoadIconDisplay();
		jQuery('.main').append('<span class="error">No records found</span>');
		throw new Error('No Records Found');
	}
	var getDomain = function (fullUrl) {
		var a = document.createElement('a');
		a.href = fullUrl;
		log('Hostname: ' + a.hostname);
		// The replace is done for IPv6 HTTP hosts
		return a.hostname.replace('[','').replace(']', '');
	}
	var getCahed = function (key) {
		log('Checking if the key `' + key + '` is in our local cache');
		var item = kango.storage.getItem(key);
		var currentTime = Math.floor(Date.now() / 1000);
		if (item == null || item.expire < currentTime) {
			log('`' + key + '` NOT in local cache')
			return false;
		}
		log('`' + key + '` IS in local cache')
		return item;
	}
	var setCahed = function (key, item) {
		log('Setting`' + key + '` in our local cache');
		item.expire = Math.floor(Date.now() / 1000) + 60*6*6; // 6 hours expire
		kango.storage.setItem(key, item)
		return item;
	}
	var getDnsRecords = function (hostname) {
		var apiUrl = 'https://api.bgpview.io/dns/live/' + hostname + '?source=browser_extension';
		log('DNS query URL: ' + apiUrl);
		var cachedRecords = getCahed(hostname);
		if (cachedRecords !== false) {
			return displayRecords(cachedRecords);
		}
		jQuery.ajax({
			url: apiUrl,
			dataType: 'json',
			error: function(xhr){
				log('API Call errored: ' + xhr.responseText)
				return abort();
			},
			success: function(data){
				if (data.status == 'error') {
					log('API Call errored: ' + data.status_message)
					return abort();
				} else if (data.data.dns_records.length < 1) {
					log('Domain returned no DNS records')
					return abort();
				}
				log(data);
				setCahed(hostname, data.data);
				return displayRecords(data.data);
			},
			timeout: 6000 // sets timeout to 6 seconds
		});
	}
	var getAsnInfo = function (asn) {
		asn = asn.toLocaleLowerCase().replace('as', '');
		var apiUrl = 'https://api.bgpview.io/asn/' + asn + '?source=browser_extension';
		apiUrl += '&with_ixs=true&with_peers=true&with_prefixes=true&with_upstreams=true&with_downstreams=true';
		log('IP query URL: ' + apiUrl);
		var cachedInfo = getCahed(asn);
		if (cachedInfo !== false) {
			return displayAsnInfo(cachedInfo);
		}
		jQuery.ajax({
			url: apiUrl,
			dataType: 'json',
			error: function(xhr){
				log('API Call errored: ' + xhr.responseText)
				return abort();
			},
			success: function(data){
				if (data.status == 'error') {
					log('API Call errored: ' + data.status_message)
					return abort();
				}
				log(data);
				setCahed(asn, data.data);
				return displayAsnInfo(data.data);
			},
			timeout: 6000 // sets timeout to 6 seconds
		});
	}
	var getAdressInfo = function (ipAddress) {
		var apiUrl = 'https://api.bgpview.io/ip/' + ipAddress + '?source=browser_extension';
		log('IP query URL: ' + apiUrl);
		var cachedInfo = getCahed(ipAddress);
		if (cachedInfo !== false) {
			return displayIpInfo(cachedInfo);
		}
		jQuery.ajax({
			url: apiUrl,
			dataType: 'json',
			error: function(xhr){
				log('API Call errored: ' + xhr.responseText)
				return abort();
			},
			success: function(data){
				if (data.status == 'error') {
					log('API Call errored: ' + data.status_message)
					return abort();
				}
				log(data);
				setCahed(ipAddress, data.data);
				return displayIpInfo(data.data);
			},
			timeout: 6000 // sets timeout to 6 seconds
		});
	}
	var getPrefixInfo = function (prefix) {
		var apiUrl = 'https://api.bgpview.io/prefix/' + prefix + '?source=browser_extension';
		log('Prefix query URL: ' + apiUrl);
		var cachedInfo = getCahed(prefix);
		if (cachedInfo !== false) {
			return displayPrefixInfo(cachedInfo);
		}
		jQuery.ajax({
			url: apiUrl,
			dataType: 'json',
			error: function(xhr){
				log('API Call errored: ' + xhr.responseText)
				return abort();
			},
			success: function(data){
				if (data.status == 'error') {
					log('API Call errored: ' + data.status_message)
					return abort();
				}
				log(data);
				setCahed(prefix, data.data);
				return displayPrefixInfo(data.data);
			},
			timeout: 6000 // sets timeout to 6 seconds
		});
	}
	var displayAsnInfo = function (data) {
		log('Processing ASN info display');
		postLoadIconDisplay();
		jQuery('.current-input a').text('AS' + data.asn);
		jQuery('.current-input').show();
		jQuery('.more-info').show();
		if (data.whois_country_code == null) {
			var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
		} else {
			var flagImage = kango.io.getResourceUrl('res/flags/24/' + data.whois_country_code + '.png');
		}
		var htmlUl = '<li role="presentation" class="active"><a href="#table-results-asn" aria-controls="table-results-asn" role="tab" data-toggle="tab" aria-expanded="true">ASN</a></li>';
		if (data.prefixes.ipv4_prefixes.length > 0 || data.prefixes.ipv6_prefixes.length > 0) {
			htmlUl += '<li role="presentation"><a href="#table-results-prefixes" aria-controls="table-results-prefixes" role="tab" data-toggle="tab" aria-expanded="true">Prefixes</a></li>';
		}
		if (data.peers.ipv4_peers.length > 0 || data.peers.ipv6_peers.length > 0) {
			htmlUl += '<li role="presentation"><a href="#table-results-peers" aria-controls="table-results-peers" role="tab" data-toggle="tab" aria-expanded="true">Peers</a></li>';
		}
		if (data.upstreams.ipv4_upstreams.length > 0 || data.upstreams.ipv6_upstreams.length > 0) {
			htmlUl += '<li role="presentation"><a href="#table-results-upstreams" aria-controls="table-results-upstreams" role="tab" data-toggle="tab" aria-expanded="true">Upstreams</a></li>';
		}
		if (data.downstreams.ipv4_downstreams.length > 0 || data.downstreams.ipv6_downstreams.length > 0) {
			htmlUl += '<li role="presentation"><a href="#table-results-downstreams" aria-controls="table-results-downstreams" role="tab" data-toggle="tab" aria-expanded="true">Downstreams</a></li>';
		}
		if (data.internet_exchanges.length > 0 || data.internet_exchanges.length > 0) {
			htmlUl += '<li role="presentation"><a href="#table-results-ix" aria-controls="table-results-ix" role="tab" data-toggle="tab" aria-expanded="true">IX</a></li>';
		}
		jQuery('#records-tab').html(htmlUl);
		// ASN INFO
		if (data.country_code == null) {
			var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
		} else {
			var flagImage = kango.io.getResourceUrl('res/flags/24/' + data.country_code + '.png');
		}
		var tabbedContentHtml = '<div role="tabpanel" class="tab-pane active" id="table-results-asn">';
		tabbedContentHtml += '<table class="table table-hover"><tbody>';
		tabbedContentHtml += '<tr><td>ASN</td><td>AS' + data.asn + '</td></tr>';
		tabbedContentHtml += '<tr><td>Country</td><td><img src="' + flagImage + '" title="' + country(data.country_code)  + '" /> ' + country(data.country_code) + '</td></tr>';
		tabbedContentHtml += '<tr><td>Name</td><td>' + data.name + '</td></tr>';
		tabbedContentHtml += '<tr><td>Description</td><td><a href="#" class="new-tab">' + data.description_short + '</a></td></tr>';
		jQuery.each(data.abuse_contacts, function( key, email ){
			tabbedContentHtml += '<tr><td>Abuse Contact</td><td><a href="mailto:' + email + '">' + email+ '</a></td></tr>';
		});
		if (data.looking_glass != null) {
			tabbedContentHtml += '<tr><td>Looking Glass</td><td><a href="#" class="new-tab">' + data.looking_glass + '</a></td></tr>';
		}
		if (data.traffic_estimation != null) {
			tabbedContentHtml += '<tr><td>Traffic Estimation</td><td>' + data.traffic_estimation + '</td></tr>';
		}
		if (data.traffic_ratio != null) {
			tabbedContentHtml += '<tr><td>Traffic Ratio</td><td>' + data.traffic_ratio + '</td></tr>';
		}
		tabbedContentHtml += '</tbody></table>';
		tabbedContentHtml += '</div>';
		// Prefixes
		if (data.prefixes.ipv4_prefixes.length > 0 || data.prefixes.ipv6_prefixes.length > 0) {
			tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-prefixes">';
			tabbedContentHtml +=	'<ul class="nav nav-tabs" role="tablist" id="records-tab">';
			var active = 'class="active"';
			if (data.prefixes.ipv4_prefixes.length > 0) {
				tabbedContentHtml +=		'<li role="presentation" ' + active + '><a href="#table-prefixes-ipv4" aria-controls="table-prefixes-ipv4" role="tab" data-toggle="tab" aria-expanded="true">IPv4 Prefixes</a></li>';
				active = '';
			}
			if (data.prefixes.ipv6_prefixes.length > 0) {
				tabbedContentHtml +=		'<li role="presentation" ' + active + '><a href="#table-prefixes-ipv6" aria-controls="table-prefixes-ipv6" role="tab" data-toggle="tab" aria-expanded="true">IPv6 Prefixes</a></li>';
				active = '';
			}
			tabbedContentHtml +=	'</ul>';
			tabbedContentHtml +=	'<div class="tab-content">';
			var active = 'active';
			if (data.prefixes.ipv4_prefixes.length > 0) {
				tabbedContentHtml += '<div role="tabpanel" class="tab-pane ' + active + '" id="table-prefixes-ipv4">';
				tabbedContentHtml +=	'<table class="table table-hover"><tbody>';
				jQuery.each(data.prefixes.ipv4_prefixes, function( key, prefix ){
					if (prefix.country_code == null) {
						var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
					} else {
						var flagImage = kango.io.getResourceUrl('res/flags/24/' + prefix.country_code + '.png');
					}
					tabbedContentHtml += '<tr>';
					tabbedContentHtml +=	 '<td><img src="' + flagImage + '" title="' + country(prefix.country_code)  + '" /></td>';
					tabbedContentHtml +=	 '<td><a class="lookup-able" href="#">' + prefix.prefix + '</a></td>';
					tabbedContentHtml +=	 '<td>' + prefix.description + '</td>';
					tabbedContentHtml += '</tr>';
				});
				tabbedContentHtml +=	'</tbody></table>';
				tabbedContentHtml += '</div>';
				active = '';
			}
			if (data.prefixes.ipv6_prefixes.length > 0) {
				tabbedContentHtml += '<div role="tabpanel" class="tab-pane ' + active + '" id="table-prefixes-ipv6">';
				tabbedContentHtml +=	'<table class="table table-hover"><tbody>';
				jQuery.each(data.prefixes.ipv6_prefixes, function( key, prefix ){
					if (prefix.country_code == null) {
						var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
					} else {
						var flagImage = kango.io.getResourceUrl('res/flags/24/' + prefix.country_code + '.png');
					}
					tabbedContentHtml += '<tr>';
					tabbedContentHtml +=	 '<td><img src="' + flagImage + '" title="' + country(prefix.country_code)  + '" /></td>';
					tabbedContentHtml +=	 '<td><a class="lookup-able" href="#">' + prefix.prefix + '</a></td>';
					tabbedContentHtml +=	 '<td>' + prefix.description + '</td>';
					tabbedContentHtml += '</tr>';
				});
				tabbedContentHtml +=	'</tbody></table>';
				tabbedContentHtml += '</div>';
				active = '';
			}
			tabbedContentHtml +=	'</div>';
			tabbedContentHtml += '</div>';
		}
		// Peers
		if (data.peers.ipv4_peers.length > 0 || data.peers.ipv6_peers.length > 0) {
			tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-peers">';
			tabbedContentHtml +=	'<ul class="nav nav-tabs" role="tablist" id="records-tab">';
			var active = 'class="active"';
			if (data.peers.ipv4_peers.length > 0) {
				tabbedContentHtml +=		'<li role="presentation" ' + active + '><a href="#table-peers-ipv4" aria-controls="table-peers-ipv4" role="tab" data-toggle="tab" aria-expanded="true">IPv4 Peers</a></li>';
				active = '';
			}
			if (data.peers.ipv6_peers.length > 0) {
				tabbedContentHtml +=		'<li role="presentation" ' + active + '><a href="#table-peers-ipv6" aria-controls="table-peers-ipv6" role="tab" data-toggle="tab" aria-expanded="true">IPv6 Peers</a></li>';
				active = '';
			}
			tabbedContentHtml +=	'</ul>';
			tabbedContentHtml +=	'<div class="tab-content">';
			var active = 'active';
			if (data.peers.ipv4_peers.length > 0) {
				tabbedContentHtml += '<div role="tabpanel" class="tab-pane ' + active + '" id="table-peers-ipv4">';
				tabbedContentHtml +=	'<table class="table table-hover"><tbody>';
				jQuery.each(data.peers.ipv4_peers, function( key, peer ){
					if (peer.country_code == null) {
						var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
					} else {
						var flagImage = kango.io.getResourceUrl('res/flags/24/' + peer.country_code + '.png');
					}
					tabbedContentHtml += '<tr>';
					tabbedContentHtml +=	 '<td><img src="' + flagImage + '" title="' + country(peer.country_code)  + '" /></td>';
					tabbedContentHtml +=	 '<td><a class="lookup-able" href="#">AS' + peer.asn + '</a></td>';
					tabbedContentHtml +=	 '<td>';
					tabbedContentHtml +=		'<a class="new-tab" href="#">' + peer.description + '</a>';
					jQuery.each(data.peers.ipv6_peers, function( key, v6peer ){
						if (v6peer.asn == peer.asn) {
							tabbedContentHtml += '<span class="support-other-proto">v6</span>';
							return false;
						}
					});
					tabbedContentHtml +=	 '</td>';
					tabbedContentHtml += '</tr>';
				});
				tabbedContentHtml +=	'</tbody></table>';
				tabbedContentHtml += '</div>';
				active = '';
			}
			if (data.peers.ipv6_peers.length > 0) {
				tabbedContentHtml += '<div role="tabpanel" class="tab-pane ' + active + '" id="table-peers-ipv6">';
				tabbedContentHtml +=	'<table class="table table-hover"><tbody>';
				jQuery.each(data.peers.ipv6_peers, function( key, peer ){
					if (peer.country_code == null) {
						var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
					} else {
						var flagImage = kango.io.getResourceUrl('res/flags/24/' + peer.country_code + '.png');
					}
					tabbedContentHtml += '<tr>';
					tabbedContentHtml +=	 '<td><img src="' + flagImage + '" title="' + country(peer.country_code)  + '" /></td>';
					tabbedContentHtml +=	 '<td><a class="lookup-able" href="#">AS' + peer.asn + '</a></td>';
					tabbedContentHtml +=	 '<td>';
					tabbedContentHtml +=		'<a class="new-tab" href="#">' + peer.description + '</a>';
					jQuery.each(data.peers.ipv4_peers, function( key, v4peer ){
						if (v4peer.asn == peer.asn) {
							tabbedContentHtml += '<span class="support-other-proto">v4</span>';
							return false;
						}
					});
					tabbedContentHtml +=	 '</td>';
					tabbedContentHtml += '</tr>';
				});
				tabbedContentHtml +=	'</tbody></table>';
				tabbedContentHtml += '</div>';
				active = '';
			}
			tabbedContentHtml +=	'</div>';
			tabbedContentHtml += '</div>';
		}
		// Upstreams
		if (data.upstreams.ipv4_upstreams.length > 0 || data.upstreams.ipv6_upstreams.length > 0) {
			tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-upstreams">';
			tabbedContentHtml +=	'<ul class="nav nav-tabs" role="tablist" id="records-tab">';
			var active = 'class="active"';
			if (data.upstreams.ipv4_upstreams.length > 0) {
				tabbedContentHtml +=		'<li role="presentation" ' + active + '><a href="#table-upstreams-ipv4" aria-controls="table-upstreams-ipv4" role="tab" data-toggle="tab" aria-expanded="true">IPv4 Upstreams</a></li>';
				active = '';
			}
			if (data.upstreams.ipv6_upstreams.length > 0) {
				tabbedContentHtml +=		'<li role="presentation" ' + active + '><a href="#table-upstreams-ipv6" aria-controls="table-upstreams-ipv6" role="tab" data-toggle="tab" aria-expanded="true">IPv6 Upstreams</a></li>';
				active = '';
			}
			tabbedContentHtml +=	'</ul>';
			tabbedContentHtml +=	'<div class="tab-content">';
			var active = 'active';
			if (data.upstreams.ipv4_upstreams.length > 0) {
				tabbedContentHtml += '<div role="tabpanel" class="tab-pane ' + active + '" id="table-upstreams-ipv4">';
				tabbedContentHtml +=	'<table class="table table-hover"><tbody>';
				jQuery.each(data.upstreams.ipv4_upstreams, function( key, upstream ){
					if (upstream.country_code == null) {
						var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
					} else {
						var flagImage = kango.io.getResourceUrl('res/flags/24/' + upstream.country_code + '.png');
					}
					tabbedContentHtml += '<tr>';
					tabbedContentHtml +=	 '<td><img src="' + flagImage + '" title="' + country(upstream.country_code)  + '" /></td>';
					tabbedContentHtml +=	 '<td><a class="lookup-able" href="#">AS' + upstream.asn + '</a></td>';
					tabbedContentHtml +=	 '<td>';
					tabbedContentHtml +=		'<a class="new-tab" href="#">' + upstream.description + '</a>';
					jQuery.each(data.upstreams.ipv6_upstreams, function( key, v6upstream ){
						if (v6upstream.asn == upstream.asn) {
							tabbedContentHtml += '<span class="support-other-proto">v6</span>';
							return false;
						}
					});
					tabbedContentHtml +=	 '</td>';
					tabbedContentHtml += '</tr>';
				});
				tabbedContentHtml +=	'</tbody></table>';
				tabbedContentHtml += '</div>';
				active = '';
			}
			if (data.upstreams.ipv6_upstreams.length > 0) {
				tabbedContentHtml += '<div role="tabpanel" class="tab-pane ' + active + '" id="table-upstreams-ipv6">';
				tabbedContentHtml +=	'<table class="table table-hover"><tbody>';
				jQuery.each(data.upstreams.ipv6_upstreams, function( key, upstream ){
					if (upstream.country_code == null) {
						var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
					} else {
						var flagImage = kango.io.getResourceUrl('res/flags/24/' + upstream.country_code + '.png');
					}
					tabbedContentHtml += '<tr>';
					tabbedContentHtml +=	 '<td><img src="' + flagImage + '" title="' + country(upstream.country_code)  + '" /></td>';
					tabbedContentHtml +=	 '<td><a class="lookup-able" href="#">AS' + upstream.asn + '</a></td>';
					tabbedContentHtml +=	 '<td>';
					tabbedContentHtml +=		'<a class="new-tab" href="#">' + upstream.description + '</a>';
					jQuery.each(data.upstreams.ipv4_upstreams, function( key, v4upstream ){
						if (v4upstream.asn == upstream.asn) {
							tabbedContentHtml += '<span class="support-other-proto">v4</span>';
							return false;
						}
					});
					tabbedContentHtml +=	 '</td>';
					tabbedContentHtml += '</tr>';
				});
				tabbedContentHtml +=	'</tbody></table>';
				tabbedContentHtml += '</div>';
				active = '';
			}
			tabbedContentHtml +=	'</div>';
			tabbedContentHtml += '</div>';
		}
		// Downstream
		if (data.downstreams.ipv4_downstreams.length > 0 || data.downstreams.ipv6_downstreams.length > 0) {
			tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-downstreams">';
			tabbedContentHtml +=	'<ul class="nav nav-tabs" role="tablist" id="records-tab">';
			var active = 'class="active"';
			if (data.downstreams.ipv4_downstreams.length > 0) {
				tabbedContentHtml +=		'<li role="presentation" ' + active + '><a href="#table-downstreams-ipv4" aria-controls="table-downstreams-ipv4" role="tab" data-toggle="tab" aria-expanded="true">IPv4 Downstreams</a></li>';
				active = '';
			}
			if (data.downstreams.ipv6_downstreams.length > 0) {
				tabbedContentHtml +=		'<li role="presentation" ' + active + '><a href="#table-downstreams-ipv6" aria-controls="table-downstreams-ipv6" role="tab" data-toggle="tab" aria-expanded="true">IPv6 Downstreams</a></li>';
				active = '';
			}
			tabbedContentHtml +=	'</ul>';
			tabbedContentHtml +=	'<div class="tab-content">';
			var active = 'active';
			if (data.downstreams.ipv4_downstreams.length > 0) {
				tabbedContentHtml += '<div role="tabpanel" class="tab-pane ' + active + '" id="table-downstreams-ipv4">';
				tabbedContentHtml +=	'<table class="table table-hover"><tbody>';
				jQuery.each(data.downstreams.ipv4_downstreams, function( key, downstream ){
					if (downstream.country_code == null) {
						var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
					} else {
						var flagImage = kango.io.getResourceUrl('res/flags/24/' + downstream.country_code + '.png');
					}
					tabbedContentHtml += '<tr>';
					tabbedContentHtml +=	 '<td><img src="' + flagImage + '" title="' + country(downstream.country_code)  + '" /></td>';
					tabbedContentHtml +=	 '<td><a class="lookup-able" href="#">AS' + downstream.asn + '</a></td>';
					tabbedContentHtml +=	 '<td>';
					tabbedContentHtml +=		'<a class="new-tab" href="#">' + downstream.description + '</a>';
					jQuery.each(data.downstreams.ipv6_downstreams, function( key, v6downstream ){
						if (v6downstream.asn == downstream.asn) {
							tabbedContentHtml += '<span class="support-other-proto">v6</span>';
							return false;
						}
					});
					tabbedContentHtml +=	 '</td>';
					tabbedContentHtml += '</tr>';
				});
				tabbedContentHtml +=	'</tbody></table>';
				tabbedContentHtml += '</div>';
				active = '';
			}
			if (data.downstreams.ipv6_downstreams.length > 0) {
				tabbedContentHtml += '<div role="tabpanel" class="tab-pane ' + active + '" id="table-downstreams-ipv6">';
				tabbedContentHtml +=	'<table class="table table-hover"><tbody>';
				jQuery.each(data.downstreams.ipv6_downstreams, function( key, downstream ){
					if (downstream.country_code == null) {
						var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
					} else {
						var flagImage = kango.io.getResourceUrl('res/flags/24/' + downstream.country_code + '.png');
					}
					tabbedContentHtml += '<tr>';
					tabbedContentHtml +=	 '<td><img src="' + flagImage + '" title="' + country(downstream.country_code)  + '"/></td>';
					tabbedContentHtml +=	 '<td><a class="lookup-able" href="#">AS' + downstream.asn + '</a></td>';
					tabbedContentHtml +=	 '<td>';
					tabbedContentHtml +=		'<a class="new-tab" href="#">' + downstream.description + '</a>';
					jQuery.each(data.downstreams.ipv4_downstreams, function( key, v4downstream ){
						if (v4downstream.asn == downstream.asn) {
							tabbedContentHtml += '<span class="support-other-proto">v4</span>';
							return false;
						}
					});
					tabbedContentHtml +=	 '</td>';
					tabbedContentHtml += '</tr>';
				});
				tabbedContentHtml +=	'</tbody></table>';
				tabbedContentHtml += '</div>';
				active = '';
			}
			tabbedContentHtml +=	'</div>';
			tabbedContentHtml += '</div>';
		}
		// IX
		if (data.internet_exchanges.length > 0) {
			tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-ix">';
			tabbedContentHtml += '<table class="table table-hover"><tbody>';
			var normilisedIx = {};
			jQuery.each(data.internet_exchanges, function( key, ix ){
				if (ix.ix_id in normilisedIx) {
					normilisedIx[ix.ix_id].speed += ix.speed;
				} else {
					normilisedIx[ix.ix_id] = ix;
				}
			});
			jQuery.each(normilisedIx, function( key, ix ){
				if (ix.country_code == null) {
					var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
				} else {
					var flagImage = kango.io.getResourceUrl('res/flags/24/' + ix.country_code + '.png');
				}
				tabbedContentHtml += '<tr>';
				tabbedContentHtml +=	 '<td><img src="' + flagImage + '" title="' + country(ix.country_code)  + '" /></td>';
				tabbedContentHtml +=	 '<td>' + humanFileSize(ix.speed) + '</td>';
				tabbedContentHtml +=	 '<td>' + ix.name_full + '</td>';
				tabbedContentHtml += '</tr>';
			});
			tabbedContentHtml += '</tbody></table>';
			tabbedContentHtml += '</div>';
		}
		jQuery(".records-tabbed-content").find('.tab-content').html(tabbedContentHtml);
	}
	var displayPrefixInfo = function (data) {
		log('Processing prefix info display');
		postLoadIconDisplay();
		jQuery('.current-input a').text(data.prefix);
		jQuery('.current-input').show();
		jQuery('.more-info').show();
		if (data.country_codes.whois_country_code == null) {
			var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
		} else {
			var flagImage = kango.io.getResourceUrl('res/flags/24/' + data.country_codes.whois_country_code + '.png');
		}
		var htmlUl = '<li role="presentation" class="active"><a href="#table-results-prefix" aria-controls="table-results-prefix" role="tab" data-toggle="tab" aria-expanded="true">Prefix</a></li>';
		htmlUl += '<li role="presentation"><a href="#table-results-asns" aria-controls="table-results-asns" role="tab" data-toggle="tab" aria-expanded="true">ASN(s)</a></li>';
		htmlUl += '<li role="presentation"><a href="#table-results-rir-allocation" aria-controls="table-results-rir-allocation" role="tab" data-toggle="tab" aria-expanded="true">RIR Allocation</a></li>';
		if (data.related_prefixes.length > 0) {
			htmlUl += '<li role="presentation"><a href="#table-results-related-prefixes" aria-controls="table-results-related-prefixes" role="tab" data-toggle="tab" aria-expanded="true">Related Prefixes</a></li>';
		}
		jQuery("#records-tab").html(htmlUl);
		var tabbedContentHtml = '<div role="tabpanel" class="tab-pane active" id="table-results-prefix">';
		tabbedContentHtml += '<table class="table table-hover"><tbody>';
		tabbedContentHtml += '<tr><td>Prefix</td><td>' + data.prefix + '</td></tr>';
		tabbedContentHtml += '<tr><td>Country</td><td><img src="' + flagImage + '" title="' + country(data.country_codes.whois_country_code)  + '" /> ' + country(data.country_codes.whois_country_code) + '</td></tr>';
		tabbedContentHtml += '<tr><td>Name</td><td>' + data.name + '</td></tr>';
		tabbedContentHtml += '<tr><td>Description</td><td>' + data.description_short + '</td></tr>';
		if (data.ip.indexOf('.') > -1) {
			tabbedContentHtml += '<tr><td>IP Addresses</td><td>' + getAddressCount(data.cidr) + '</td></tr>';
		}
		jQuery.each(data.abuse_contacts, function( key, email ){
			tabbedContentHtml += '<tr><td>Abuse Contact</td><td><a href="mailto:' + email + '">' + email+ '</a></td></tr>';
		});
		tabbedContentHtml += '</tbody></table>';
		tabbedContentHtml += '</div>';
		tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-asns">';
		tabbedContentHtml += '<table class="table table-hover"><tbody>';
		jQuery.each(data.asns, function( key, asn ){
			if (asn.country_code == null) {
				var asnFlagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
			} else {
				var asnFlagImage = kango.io.getResourceUrl('res/flags/24/' + asn.country_code + '.png');
			}
			tabbedContentHtml += '<tr>';
			tabbedContentHtml += '<td><img src="' + asnFlagImage + '" title="' + country(asn.country_code) + '"/></td>';
			tabbedContentHtml += '<td><a class="lookup-able" href="#">AS' + asn.asn + '</a></td>';
			tabbedContentHtml += '<td>' + asn.description + '</td>';
			tabbedContentHtml += '</tr>';
		});
		tabbedContentHtml += '</tbody></table>';
		tabbedContentHtml += '</div>';
		tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-rir-allocation">';
		tabbedContentHtml += '<table class="table table-hover"><tbody>';
		tabbedContentHtml += '<tr><td>RIR Name</td><td>' + data.rir_allocation.rir_name + '</td></tr>';
		tabbedContentHtml += '<tr><td>Prefix</td><td><a class="lookup-able" href="#">' + data.rir_allocation.prefix + '</a></td></tr>';
		tabbedContentHtml += '<tr><td>Country</td><td><img src="' + kango.io.getResourceUrl('res/flags/24/' + data.rir_allocation.country_code + '.png') + '" title="' + country(data.rir_allocation.whois_country_code)  + '" /> ' + country(data.rir_allocation.country_code) + '</td></tr>';
		if (data.rir_allocation.ip.indexOf('.') > -1) {
			tabbedContentHtml += '<tr><td>IP Addresses</td><td>' + getAddressCount(data.rir_allocation.cidr) + '</td></tr>';
		}
		tabbedContentHtml += '<tr><td>Date Allocated</td><td>' + displayDate(data.rir_allocation.date_allocated) + '</td></tr>';
		tabbedContentHtml += '</tbody></table>';
		tabbedContentHtml += '</div>';
		if (data.related_prefixes.length > 0) {
			tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-related-prefixes">';
			tabbedContentHtml += '<table class="table table-hover"><tbody>';
			jQuery.each(data.related_prefixes, function (key, prefix) {
				if (prefix.country_code == null) {
					var asnFlagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
				} else {
					var asnFlagImage = kango.io.getResourceUrl('res/flags/24/' + prefix.country_code + '.png');
				}
				tabbedContentHtml += '<tr>';
				tabbedContentHtml += '<td><img src="' + asnFlagImage + '" title="' + country(prefix.country_code) + '"/></td>';
				tabbedContentHtml += '<td><a class="lookup-able" href="#">' + prefix.prefix + '</a></td>';
				tabbedContentHtml += '<td>' + prefix.description + '</td>';
				tabbedContentHtml += '</tr>';
			});
			tabbedContentHtml += '</tbody></table>';
			tabbedContentHtml += '</div>';
		}
		jQuery(".records-tabbed-content").find('.tab-content').html(tabbedContentHtml);
	}
	var displayIpInfo = function (data) {
		log('Processing IP info display');
		postLoadIconDisplay();
		jQuery('.current-input a').text(data.ip);
		jQuery('.current-input').show();
		jQuery('.more-info').show();
		if (data.maxmind.country_code != null) {
			var flagImage = kango.io.getResourceUrl('res/flags/24/' + data.maxmind.country_code + '.png');
			var countryCode = data.maxmind.country_code;
		} else if (typeof data.prefixes[0] != 'undefined' && data.prefixes[0].country_code != null) {
			var flagImage = kango.io.getResourceUrl('res/flags/24/' + data.prefixes[0].country_code + '.png');
			var countryCode = data.prefixes[0].country_code;
		} else{
			var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
			var countryCode = null;
		}
		if (data.ptr_record == null) {
			data.ptr_record = '<em>None</em>';
		} else {
			data.ptr_record = '<a class="lookup-able" href="#">' + data.ptr_record  + '</a>';
		}
		var htmlUl = '<li role="presentation" class="active"><a href="#table-results-ip-info" aria-controls="table-results-ip-info" role="tab" data-toggle="tab" aria-expanded="true">IP Info</a></li>';
		if (data.prefixes.length > 1) {
			htmlUl += '<li role="presentation"><a href="#table-results-prefixes" aria-controls="table-results-prefixes" role="tab" data-toggle="tab" aria-expanded="true">Prefixes</a></li>';
		}
		htmlUl += '<li role="presentation"><a href="#table-results-rir-allocation" aria-controls="table-results-rir-allocation" role="tab" data-toggle="tab" aria-expanded="true">RIR Allocation</a></li>';
		jQuery("#records-tab").html(htmlUl);
		var tabbedContentHtml = '<div role="tabpanel" class="tab-pane active" id="table-results-ip-info">';
		tabbedContentHtml += '<table class="table table-hover"><tbody>';
		tabbedContentHtml += '<tr><td>IP</td><td>' + data.ip + '</td></tr>';
		tabbedContentHtml += '<tr><td>Country</td><td><img src="' + flagImage + '" title="' + country(countryCode)  + '" /> ' + country(data.maxmind.country_code) + '</td></tr>';
		tabbedContentHtml += '<tr><td>rDNS</td><td>' + data.ptr_record + '</td></tr>';
		if (typeof data.prefixes[0] != "undefined") {
			tabbedContentHtml += '<tr><td>Prefix</td><td><a class="lookup-able" href="#">' + data.prefixes[0].prefix + '</a></td></tr>';
			tabbedContentHtml += '<tr><td>ASN</td><td><a class="lookup-able" href="#">AS' + data.prefixes[0].asn.asn + '</a></td></tr>';
			tabbedContentHtml += '<tr><td>Description</td><td>' + data.prefixes[0].description + '</td></tr>';
		}
		tabbedContentHtml += '</tbody></table>';
		tabbedContentHtml += '</div>';
		if (data.prefixes.length > 1) {
			tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-prefixes">';
			tabbedContentHtml += '<table class="table table-hover"><tbody>';
			jQuery.each(data.prefixes, function( key, prefix ){
				if (prefix.country_code == null) {
					var asnFlagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
				} else {
					var asnFlagImage = kango.io.getResourceUrl('res/flags/24/' + prefix.country_code + '.png');
				}
				tabbedContentHtml += '<tr>';
				tabbedContentHtml += '<td><img src="' + asnFlagImage + '" title="' + country(prefix.country_code) + '"/></td>';
				tabbedContentHtml += '<td><a class="lookup-able" href="#">AS' + prefix.asn.asn + '</a></td>';
				tabbedContentHtml += '<td><a class="lookup-able" href="#">' + prefix.prefix + '</a></td>';
				tabbedContentHtml += '<td>' + prefix.description + '</td>';
				tabbedContentHtml += '</tr>';
			});
			tabbedContentHtml += '</tbody></table>';
			tabbedContentHtml += '</div>';
		}
		tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-rir-allocation">';
		tabbedContentHtml += '<table class="table table-hover"><tbody>';
		tabbedContentHtml += '<tr><td>RIR Name</td><td>' + data.rir_allocation.rir_name + '</td></tr>';
		tabbedContentHtml += '<tr><td>Prefix</td><td><a class="lookup-able" href="#">' + data.rir_allocation.prefix + '</a></td></tr>';
		tabbedContentHtml += '<tr><td>Country</td><td><img src="' + kango.io.getResourceUrl('res/flags/24/' + data.rir_allocation.country_code + '.png') + '" title="' + country(data.rir_allocation.whois_country_code)  + '" /> ' + country(data.rir_allocation.country_code) + '</td></tr>';
		if (data.rir_allocation.ip.indexOf('.') > -1) {
			tabbedContentHtml += '<tr><td>IP Addresses</td><td>' + getAddressCount(data.rir_allocation.cidr) + '</td></tr>';
		}
		tabbedContentHtml += '<tr><td>Date Allocated</td><td>' + displayDate(data.rir_allocation.date_allocated) + '</td></tr>';
		tabbedContentHtml += '</tbody></table>';
		tabbedContentHtml += '</div>';
		jQuery(".records-tabbed-content").find('.tab-content').html(tabbedContentHtml);
	}
	var getAddressCount = function (length, type) {
		return Math.pow(2, (type === 6 ? 128 : 32) - length);
	};
	var displayRecords = function (data) {
		log('Processing record display');
		postLoadIconDisplay();
		jQuery('.current-input a').text(data.hostname);
		jQuery('.base-domain a').text(data.base_domain);
		jQuery('.current-input').show();
		if (data.hostname != data.base_domain) {
			jQuery('.base-domain').show();
		}
		var active = 'active';
		jQuery.each(data.dns_records, function( rrType, records ){
			var htmlUl = '<li role="presentation" class="' + active + '"><a href="#table-results-' + rrType + '" aria-controls="table-results-' + rrType + '" role="tab" data-toggle="tab" aria-expanded="true">' + rrType + '</a></li>';
			jQuery("#records-tab").append(htmlUl);
			var tabbedContentHtml = '<div role="tabpanel" class="tab-pane ' + active + '" id="table-results-' + rrType + '"></div>';
			jQuery(".records-tabbed-content").find('.tab-content').append(tabbedContentHtml);
			// Execute the RR render
			if (rrType === 'A') {
				renderA(records);
			} else if (rrType === 'AAAA') {
				renderAAAA(records);
			} else if (rrType === 'NS') {
				renderNS(records);
			} else if (rrType === 'MX') {
				renderMX(records);
			} else if (rrType === 'TXT') {
				renderTXT(records);
			} else if (rrType === 'SOA') {
				renderSOA(records);
			} else if (rrType === 'CNAME') {
				renderCNAME(records);
			}
			if (active !== '') {
				active = ''
			}
		});
	}
	var renderAddressRecords = function (rrType, records) {
		log('Rendering all ' + rrType + ' records');
		var html = '<table class="table table-hover"><tbody>';
		jQuery.each(records, function( key, record ){
			if (record.country_code == null) {
				record.country_code = '_unknown';
			}
			var flagImage = kango.io.getResourceUrl('res/flags/24/' + record.country_code + '.png');
			html += '<tr>';
			html +=	 '<td><img src="' + flagImage + '" title="' + country(record.country_code)  + '" /></td>';
			html +=	 '<td><a class="lookup-able" href="#">' + record.address + '</a></td>';
			html +=	 '<td>' + record.location + '</td>';
			html += '</tr>';
		});
		html += '</tbody></table>';
		jQuery('#table-results-' + rrType).html(html);
	}
	var renderStringRecords = function (rrType, records, makeLink) {
		log('Rendering all ' + rrType + ' records');
		var html = '<table class="table table-hover"><tbody>';
		jQuery.each(records, function( key, record ){
			if (makeLink === true) {
				record = '<a class="lookup-able" href="#">' + record + '</a>';
			}
			html += '<tr>';
			html +=	 '<td>' + record + '</td>';
			html += '</tr>';
		});
		html += '</tbody></table>';
		jQuery('#table-results-' + rrType).html(html);
	}
	var renderA = function (records) {
		return renderAddressRecords('A', records)
	}
	var renderAAAA = function (records) {
		return renderAddressRecords('AAAA', records)
	}
	var renderNS = function (records) {
		return renderStringRecords('NS', records, true)
	}
	var renderMX = function (records) {
		return renderStringRecords('MX', records, true)
	}
	var renderTXT = function (records) {
		log('Rendering all TXT records');
		var html = '<table class="table table-hover"><tbody>';
		jQuery.each(records, function( key, record ){
			// Check if record is SPF
			if (record.toLowerCase().lastIndexOf('v=spf1', 0) === 0) {
				var spfParts = record.split(' ');
				// Loop through all the SPF parts to replace IPs and domains
				jQuery.each(spfParts, function( key, value ){
					value = value.toLocaleLowerCase();
					if (value.lastIndexOf('ip4:', 0) === 0) {
						var parts = value.split('ip4:');
						spfParts[key] = 'ip4:' + '<a class="lookup-able" href="#">' + parts[1] + '</a>';
					} else if (value.lastIndexOf('ip6:', 0) === 0) {
						var parts = value.split('ip6:');
						spfParts[key] = 'ip6:' + '<a class="lookup-able" href="#">' + parts[1] + '</a>';
					} else if (value.lastIndexOf('include:', 0) === 0) {
						var parts = value.split('include:');
						spfParts[key] = 'include:' + '<a class="lookup-able" href="#">' + parts[1] + '</a>';
					}
				});
				record = spfParts.join(' ');
			}
			html += '<tr>';
			html +=	 '<td>' + record + '</td>';
			html += '</tr>';
		});
		html += '</tbody></table>';
		jQuery('#table-results-TXT').html(html);
	}
	var renderSOA = function (records) {
		return renderStringRecords('SOA', records)
	}
	var renderCNAME = function (records) {
		return renderStringRecords('CNAME', records, true)
	}
	jQuery('body').on('click', '.lookup-able', function(){
		start(jQuery(this).text(), true);
	});
	jQuery('body').on('click', '.back-btn', function(){
		dataHistory.pop();
		start(dataHistory[dataHistory.length - 1], true, true);
	});
	jQuery('body').on('click', '.new-tab', function(){
		kango.browser.tabs.create({url:'http://www.google.com/search?hl=en&q=' + encodeURIComponent(jQuery(this).text().replace(' ', '+')) + '&btnI=745'});
	});
	jQuery('body').on('click', '.more-info', function(){
		kango.browser.tabs.create({url:'https://bgpview.io/search/redirect/' + jQuery('.current-input a').text()});
	});
});
