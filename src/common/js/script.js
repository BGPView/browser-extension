KangoAPI.onReady(function() {

    var debug = true;

    kango.browser.tabs.getCurrent(function(tab) {
        start(tab.getUrl(), false);
    });

    function start(fullUrl, parsed) {
        log('Starting the JS process + cleanup...');

        $('.tab-content').text('');
        $('.nav-tabs').text('');
        $("#records-tab").text('');
        $('.current-input').hide();
        $('.base-domain').hide();
        $('.loader').show();

        log('Current input URL: ' + fullUrl);

        if (parsed === true) {
            var hostname = fullUrl;
        } else {
            var hostname = getDomain(fullUrl);
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

    function log(message) {
        if (debug === true) {
            kango.console.log(message);
        }
    }

    function validIP(ipAddress)
    {
        var expression = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))/;

        if (expression.test(ipAddress)) {
            return true;
        } else {
            return false;
        }
    }

    function validAsn(asn)
    {
        var asn = asn.toLowerCase().replace('as', '');

        if (asn % 1 !== 0) {
            return false;
        }

        return true;
    }

    function validPrefix(prefix)
    {
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

    function abort() {
        log('Sending an abort');

        $('.loader').hide();
        $(".main").append('<span class="error">No records found</span>');

        throw new Error('No Records Found');
    }

    function getDomain(fullUrl) {
        var a = document.createElement('a');
        a.href = fullUrl;
        log('Hostname: ' + a.hostname);
        // The replace is done for IPv6 HTTP hosts
        return a.hostname.replace('[','').replace(']', '');
    }

    function getCahed(key)
    {
        log('Checking if the key `' + key + '` is in our local cache');
        var item = kango.storage.getItem(key);
        var currentTime = Math.floor(Date.now() / 1000);

        if (item === null || item.expire < currentTime) {
            log('`' + key + '` NOT in local cache')
            return false;
        }

        log('`' + key + '` IS in local cache')
        return item;
    }

    function setCahed(key, item)
    {
        log('Setting`' + key + '` in our local cache');

        item.expire = Math.floor(Date.now() / 1000) + 60*6*6; // 6 hours expire
        kango.storage.setItem(key, item)

        return item;
    }

    function getDnsRecords(hostname) {
        var apiUrl = 'https://api.bgpview.io/dns/live/' + hostname + '?source=browser_extension';
        log('DNS query URL: ' + apiUrl);

        var cachedRecords = getCahed(hostname);
        if (cachedRecords !== false) {
            return displayRecords(cachedRecords);
        }

        $.ajax({
            url: apiUrl,
            dataType: "json",
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

    function getAsnInfo(asn)
    {
        asn = asn.toLocaleLowerCase().replace('as', '');

        var apiUrl = 'https://api.bgpview.io/asn/' + asn + '?source=browser_extension';
        apiUrl += '&with_ixs=true&with_peers=true&with_prefixes=true&with_upstreams=true&with_downstreams=true';

        log('IP query URL: ' + apiUrl);

        var cachedInfo = getCahed(asn);
        if (cachedInfo !== false) {
            return displayAsnInfo(cachedInfo);
        }

        $.ajax({
            url: apiUrl,
            dataType: "json",
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

    function getAdressInfo(ipAddress)
    {
        var apiUrl = 'https://api.bgpview.io/ip/' + ipAddress + '?source=browser_extension';
        log('IP query URL: ' + apiUrl);

        var cachedInfo = getCahed(ipAddress);
        if (cachedInfo !== false) {
            return displayIpInfo(cachedInfo);
        }

        $.ajax({
            url: apiUrl,
            dataType: "json",
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

    function getPrefixInfo(prefix)
    {
        var apiUrl = 'https://api.bgpview.io/prefix/' + prefix + '?source=browser_extension';
        log('Prefix query URL: ' + apiUrl);

        var cachedInfo = getCahed(prefix);
        if (cachedInfo !== false) {
            return displayPrefixInfo(cachedInfo);
        }

        $.ajax({
            url: apiUrl,
            dataType: "json",
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

    function displayAsnInfo(data)
    {
        log('Processing ASN info display');
        $('.loader').hide();

        $('.current-input a').text('AS' + data.asn);
        $('.current-input').show();

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

        $("#records-tab").html(htmlUl);


        // ASN INFO
        if (data.country_code == null) {
            var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
        } else {
            var flagImage = kango.io.getResourceUrl('res/flags/24/' + data.country_code + '.png');
        }
        var tabbedContentHtml = '<div role="tabpanel" class="tab-pane active" id="table-results-asn">';
        tabbedContentHtml += '<table class="table table-hover"><tbody>';
        tabbedContentHtml += '<tr><td>ASN</td><td>AS' + data.asn + '</td></tr>';
        tabbedContentHtml += '<tr><td>Country</td><td><img src="' + flagImage + '" /> ' + data.country_code + '</td></tr>';
        tabbedContentHtml += '<tr><td>Name</td><td>' + data.name + '</td></tr>';
        tabbedContentHtml += '<tr><td>Description</td><td><a href="#" class="new-tab">' + data.description_short + '</a></td></tr>';
        $.each(data.abuse_contacts, function( key, email ){
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




        $(".records-tabbed-content").find('.tab-content').html(tabbedContentHtml);
    }

    function displayPrefixInfo(data)
    {
        log('Processing prefix info display');
        $('.loader').hide();

        $('.current-input a').text(data.prefix);
        $('.current-input').show();

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
        $("#records-tab").html(htmlUl);

        var tabbedContentHtml = '<div role="tabpanel" class="tab-pane active" id="table-results-prefix">';
        tabbedContentHtml += '<table class="table table-hover"><tbody>';
        tabbedContentHtml += '<tr><td>Prefix</td><td>' + data.prefix + '</td></tr>';
        tabbedContentHtml += '<tr><td>Country</td><td><img src="' + flagImage + '" /> ' + data.country_codes.whois_country_code + '</td></tr>';
        tabbedContentHtml += '<tr><td>Name</td><td>' + data.name + '</td></tr>';
        tabbedContentHtml += '<tr><td>Description</td><td>' + data.description_short + '</td></tr>';
        if (data.ip.indexOf('.') > -1) {
            tabbedContentHtml += '<tr><td>IP Addresses</td><td>' + getAddressCount(data.cidr) + '</td></tr>';
        }
        $.each(data.abuse_contacts, function( key, email ){
            tabbedContentHtml += '<tr><td>Abuse Contact</td><td><a href="mailto:' + email + '">' + email+ '</a></td></tr>';
        });
        tabbedContentHtml += '</tbody></table>';
        tabbedContentHtml += '</div>';

        tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-asns">';
        tabbedContentHtml += '<table class="table table-hover"><tbody>';
        $.each(data.asns, function( key, asn ){
            if (asn.country_code == null) {
                var asnFlagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
            } else {
                var asnFlagImage = kango.io.getResourceUrl('res/flags/24/' + asn.country_code + '.png');
            }

            tabbedContentHtml += '<tr>';
            tabbedContentHtml += '<td><img src="' + asnFlagImage + '" title="' + asn.country_code + '"/></td>';
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
        tabbedContentHtml += '<tr><td>Country</td><td><img src="' + kango.io.getResourceUrl('res/flags/24/' + data.rir_allocation.country_code + '.png') + '" /> ' + data.rir_allocation.country_code + '</td></tr>';
        if (data.rir_allocation.ip.indexOf('.') > -1) {
            tabbedContentHtml += '<tr><td>IP Addresses</td><td>' + getAddressCount(data.rir_allocation.cidr) + '</td></tr>';
        }
        tabbedContentHtml += '<tr><td>Date Allocated</td><td>' + data.rir_allocation.date_allocated + '</td></tr>';
        tabbedContentHtml += '</tbody></table>';
        tabbedContentHtml += '</div>';


        if (data.related_prefixes.length > 0) {
            tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-related-prefixes">';
            tabbedContentHtml += '<table class="table table-hover"><tbody>';
            $.each(data.related_prefixes, function (key, prefix) {
                if (prefix.country_code == null) {
                    var asnFlagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
                } else {
                    var asnFlagImage = kango.io.getResourceUrl('res/flags/24/' + prefix.country_code + '.png');
                }

                tabbedContentHtml += '<tr>';
                tabbedContentHtml += '<td><img src="' + asnFlagImage + '" title="' + prefix.country_code + '"/></td>';
                tabbedContentHtml += '<td><a class="lookup-able" href="#">' + prefix.prefix + '</a></td>';
                tabbedContentHtml += '<td>' + prefix.description + '</td>';
                tabbedContentHtml += '</tr>';
            });
            tabbedContentHtml += '</tbody></table>';
            tabbedContentHtml += '</div>';
        }

        $(".records-tabbed-content").find('.tab-content').html(tabbedContentHtml);
    }

    function displayIpInfo(data)
    {
        log('Processing IP info display');
        $('.loader').hide();

        $('.current-input a').text(data.ip);
        $('.current-input').show();

        if (data.maxmind.country_code == null) {
            var flagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
        } else {
            var flagImage = kango.io.getResourceUrl('res/flags/24/' + data.maxmind.country_code + '.png');
        }

        if (data.ptr_record == null) {
            data.ptr_record = '<em>None</em>';
        } else {
            data.ptr_record = '<a class="lookup-able" href="#">' + data.ptr_record  + '</a>';
        }

        var htmlUl = '<li role="presentation" class="active"><a href="#table-results-ip-info" aria-controls="table-results-ip-info" role="tab" data-toggle="tab" aria-expanded="true">IP Info</a></li>';
        htmlUl += '<li role="presentation"><a href="#table-results-prefixes" aria-controls="table-results-prefixes" role="tab" data-toggle="tab" aria-expanded="true">Prefix(es)</a></li>';
        htmlUl += '<li role="presentation"><a href="#table-results-rir-allocation" aria-controls="table-results-rir-allocation" role="tab" data-toggle="tab" aria-expanded="true">RIR Allocation</a></li>';
        $("#records-tab").html(htmlUl);

        var tabbedContentHtml = '<div role="tabpanel" class="tab-pane active" id="table-results-ip-info">';
        tabbedContentHtml += '<table class="table table-hover"><tbody>';
        tabbedContentHtml += '<tr><td>IP</td><td>' + data.ip + '</td></tr>';
        tabbedContentHtml += '<tr><td>Country</td><td><img src="' + flagImage + '" /> ' + data.maxmind.country_code + '</td></tr>';
        tabbedContentHtml += '<tr><td>rDNS</td><td>' + data.ptr_record + '</td></tr>';
        tabbedContentHtml += '</tbody></table>';
        tabbedContentHtml += '</div>';


        tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-prefixes">';
        tabbedContentHtml += '<table class="table table-hover"><tbody>';
        $.each(data.prefixes, function( key, prefix ){
            if (prefix.country_code == null) {
                var asnFlagImage = kango.io.getResourceUrl('res/flags/24/_unknown.png');
            } else {
                var asnFlagImage = kango.io.getResourceUrl('res/flags/24/' + prefix.country_code + '.png');
            }

            tabbedContentHtml += '<tr>';
            tabbedContentHtml += '<td><img src="' + asnFlagImage + '" title="' + prefix.country_code + '"/></td>';
            tabbedContentHtml += '<td><a class="lookup-able" href="#">AS' + prefix.asn.asn + '</a></td>';
            tabbedContentHtml += '<td><a class="lookup-able" href="#">' + prefix.prefix + '</a></td>';
            tabbedContentHtml += '<td>' + prefix.description + '</td>';
            tabbedContentHtml += '</tr>';
        });
        tabbedContentHtml += '</tbody></table>';
        tabbedContentHtml += '</div>';

        tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-rir-allocation">';
        tabbedContentHtml += '<table class="table table-hover"><tbody>';
        tabbedContentHtml += '<tr><td>RIR Name</td><td>' + data.rir_allocation.rir_name + '</td></tr>';
        tabbedContentHtml += '<tr><td>Prefix</td><td><a class="lookup-able" href="#">' + data.rir_allocation.prefix + '</a></td></tr>';
        tabbedContentHtml += '<tr><td>Country</td><td><img src="' + kango.io.getResourceUrl('res/flags/24/' + data.rir_allocation.country_code + '.png') + '" /> ' + data.rir_allocation.country_code + '</td></tr>';
        if (data.rir_allocation.ip.indexOf('.') > -1) {
            tabbedContentHtml += '<tr><td>IP Addresses</td><td>' + getAddressCount(data.rir_allocation.cidr) + '</td></tr>';
        }
        tabbedContentHtml += '<tr><td>Date Allocated</td><td>' + data.rir_allocation.date_allocated + '</td></tr>';
        tabbedContentHtml += '</tbody></table>';
        tabbedContentHtml += '</div>';

        $(".records-tabbed-content").find('.tab-content').html(tabbedContentHtml);

    }

    function getAddressCount(cidr)
    {
        var ipObj = {
            1: '2,147,483,648',
            2: '1,073,741,824',
            3: '536,870,912',
            4: '268,435,456',
            5: '134,217,728',
            6: '67,108,864',
            7: '33,554,432',
            8: '16,777,216',
            9: '8,388,608',
            10: '4,194,304',
            11: '2,097,152',
            12: '1,048,576',
            13: '524,288',
            14: '262,144',
            15: '131,072',
            16: '65,536',
            17: '32,768',
            18: '16,384',
            19: '8,192',
            20: '4,096',
            21: '2,048',
            22: '1,024',
            23: '512',
            24: '256',
            25: '128',
            26: '64',
            27: '32',
            28: '16',
            29: '8',
            30: '4',
            31: '2',
            32: '1'
        };

        return ipObj[cidr];
    }

    function displayRecords(data)
    {
        log('Processing record display');
        $('.loader').hide();

        $('.current-input a').text(data.hostname);
        $('.base-domain a').text(data.base_domain);

        $('.current-input').show();
        if (data.hostname != data.base_domain) {
            $('.base-domain').show();
        }

        var active = 'active';
        $.each(data.dns_records, function( rrType, records ){
            var htmlUl = '<li role="presentation" class="' + active + '"><a href="#table-results-' + rrType + '" aria-controls="table-results-' + rrType + '" role="tab" data-toggle="tab" aria-expanded="true">' + rrType + '</a></li>';
            $("#records-tab").append(htmlUl);

            var tabbedContentHtml = '<div role="tabpanel" class="tab-pane ' + active + '" id="table-results-' + rrType + '"></div>';
            $(".records-tabbed-content").find('.tab-content').append(tabbedContentHtml);

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

    function renderAddressRecords(rrType, records)
    {
        log('Rendering all ' + rrType + ' records');

        var html = '<table class="table table-hover"><tbody>';

        $.each(records, function( key, record ){

            if (record.country_code == null) {
                record.country_code = '_unknown';
            }

            var flagImage = kango.io.getResourceUrl('res/flags/24/' + record.country_code + '.png');

            html += '<tr>';
            html +=     '<td><img src="' + flagImage + '" /></td>';
            html +=     '<td><a class="lookup-able" href="#">' + record.address + '</a></td>';
            html +=     '<td>' + record.location + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        $('#table-results-' + rrType).html(html);
    }

    function renderStringRecords(rrType, records, makeLink)
    {
        log('Rendering all ' + rrType + ' records');

        var html = '<table class="table table-hover"><tbody>';

        $.each(records, function( key, record ){

            if (makeLink === true) {
                record = '<a class="lookup-able" href="#">' + record + '</a>';
            }

            html += '<tr>';
            html +=     '<td>' + record + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        $('#table-results-' + rrType).html(html);
    }

    function renderA(records)
    {
        return renderAddressRecords('A', records)
    }

    function renderAAAA(records)
    {
        return renderAddressRecords('AAAA', records)
    }

    function renderNS(records)
    {
        return renderStringRecords('NS', records, true)
    }

    function renderMX(records)
    {
        return renderStringRecords('MX', records, true)
    }

    function renderTXT(records)
    {
        log('Rendering all TXT records');

        var html = '<table class="table table-hover"><tbody>';

        $.each(records, function( key, record ){

            // Check if record is SPF
            if (record.toLowerCase().lastIndexOf('v=spf1', 0) === 0) {
                var spfParts = record.split(' ');
                // Loop through all the SPF parts to replace IPs and domains
                $.each(spfParts, function( key, value ){
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
            html +=     '<td>' + record + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        $('#table-results-TXT').html(html);
    }

    function renderSOA(records)
    {
        return renderStringRecords('SOA', records)
    }

    function renderCNAME(records)
    {
        return renderStringRecords('CNAME', records, true)
    }

    $('body').on('click', '.lookup-able', function(){
        start($(this).text(), true);
    });

    $('body').on('click', '.new-tab', function(){
        kango.browser.tabs.create({url:'http://www.google.com/search?hl=en&q=' + $(this).text().replace(' ', '+') + '&btnI=745'});
    });



});