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
        } else {
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
        var apiUrl = 'https://api.bgpview.io/dns/live/' + hostname;
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

    function getAdressInfo(ipAddress)
    {
        var apiUrl = 'https://api.bgpview.io/ip/' + ipAddress;
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

        var htmlUl = '<li role="presentation" class="active"><a href="#table-results-ip-info" aria-controls="table-results-ip-info" role="tab" data-toggle="tab" aria-expanded="true">IP Info</a></li>';
        htmlUl += '<li role="presentation"><a href="#table-results-prefixes" aria-controls="table-results-prefixes" role="tab" data-toggle="tab" aria-expanded="true">Prefix(es)</a></li>';
        $("#records-tab").html(htmlUl);

        var tabbedContentHtml = '<div role="tabpanel" class="tab-pane active" id="table-results-ip-info">';
        tabbedContentHtml += '<table class="table table-hover"><tbody>';
        tabbedContentHtml += '<tr><td>IP</td><td>' + data.ip + '</td></tr>';
        tabbedContentHtml += '<tr><td>Country</td><td><img src="' + flagImage + '" /> ' + data.maxmind.country_code + '</td></tr>';
        tabbedContentHtml += '</tbody></table>';
        tabbedContentHtml += '</div>';


        tabbedContentHtml += '<div role="tabpanel" class="tab-pane" id="table-results-prefixes">';
        tabbedContentHtml += '<table class="table table-hover"><tbody>';
        $.each(data.prefixes, function( key, prefix ){
            tabbedContentHtml += '<tr>';
            tabbedContentHtml += '<td><a class="lookup-able" href="#">AS' + prefix.asn.asn + '</a></td>';
            tabbedContentHtml += '<td><a class="lookup-able" href="#">' + prefix.prefix + '</a></td>';
            tabbedContentHtml += '<td>' + prefix.description + '</td>';
            tabbedContentHtml += '</tr>';
        });
        tabbedContentHtml += '</tbody></table>';
        tabbedContentHtml += '</div>';
        $(".records-tabbed-content").find('.tab-content').html(tabbedContentHtml);

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
        return renderStringRecords('TXT', records)
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
    })

});