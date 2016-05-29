KangoAPI.onReady(function() {

    var debug = true;

    kango.browser.tabs.getCurrent(function(tab) {
        start(tab.getUrl());
    });

    function start(fullUrl) {
        log('Starting the JS process + cleanup...');

        $('.tab-content').text('');
        $('.nav-tabs').text('');

        log('Current tab URL: ' + fullUrl);

        getDnsRecords(getDomain(fullUrl));
    }

    function log(message) {
        if (debug === true) {
            kango.console.log(message);
        }
    }

    function abort() {
        log('Sending an abort');

        $('.loader').hide();
        $(".main").append('No DNS records found');

        throw new Error('No DNS Records Found');
    }

    function getDomain(fullUrl) {
        var a = document.createElement('a');
        a.href = fullUrl;
        log('Hostname: ' + a.hostname);
        return a.hostname;
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

    function displayRecords(data)
    {
        log('Processing record display');
        $('.loader').hide();

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
            html +=     '<td>' + record.address + '</td>';
            html +=     '<td>' + record.location + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        $('#table-results-' + rrType).html(html);
    }

    function renderStringRecords(rrType, records)
    {
        log('Rendering all ' + rrType + ' records');

        var html = '<table class="table table-hover"><tbody>';

        $.each(records, function( key, record ){
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
        return renderStringRecords('NS', records)
    }

    function renderMX(records)
    {
        return renderStringRecords('MX', records)
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
        return renderStringRecords('CNAME', records)
    }

});