KangoAPI.onReady(function() {

    var debug = true;

    kango.browser.tabs.getCurrent(function(tab) {
        start(tab.getUrl());
    });

    function start(fullUrl) {
        log('Starting the JS process...');
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

    function getDnsRecords(hostname) {
        var apiUrl = 'https://api.bgpview.io/dns/live/' + hostname;
        log('DNS query URL: ' + apiUrl);

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
                displayRecords(data.data);
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
                renderAAAA()(records);
            } else if (rrType === 'NS') {
                renderNS()(records);
            } else if (rrType === 'MX') {
                renderMX()(records);
            } else if (rrType === 'TXT') {
                renderTXT()(records);
            } else if (rrType === 'SOA') {
                renderSOA()(records);
            } else if (rrType === 'CNAME') {
                renderCNAME()(records);
            }

            $.each(value, function( key, record ){
                $('#table-results-' + rrType).append(record + '<br />');
            });

            if (active !== '') {
                active = ''
            }
        });
    }

    function renderA(records)
    {
        log('Rendering all A records');
        $.each(records, function( key, record ){
            $('#table-results-A').append(record.address + ' ' + record.location + '<br />');
        });
    }

    function renderAAAA(records)
    {
        log('Rendering all AAAA records');
        $.each(records, function( key, record ){
            $('#table-results-AAAA').append(record.address + ' ' + record.location + '<br />');
        });
    }

    function renderNS(records)
    {
        log('Rendering all NS records');
    }

    function renderMX(records)
    {
        log('Rendering all MX records');
    }

    function renderTXT(records)
    {
        log('Rendering all TXT records');
    }

    function renderSOA(records)
    {
        log('Rendering all SOA records');
    }

    function renderCNAME(records)
    {
        log('Rendering all CNAME records');
    }

});