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
        log('Rending Records');
        $('.loader').hide();

        var active = 'active';
        $.each(data.dns_records, function( index, value ){
            var htmlUl = '<li role="presentation" class="' + active + '"><a href="#table-results-' + index + '" aria-controls="table-results-' + index + '" role="tab" data-toggle="tab" aria-expanded="true">' + index + '</a></li>';
            $("#records-tab").append(htmlUl);

            var tabbedContentHtml = '<div role="tabpanel" class="tab-pane ' + active + '" id="table-results-' + index + '"></div>';
            $(".records-tabbed-content").find('.tab-content').append(tabbedContentHtml);

            $.each(value, function( key, record ){
                $('#table-results-' + index).append(record + '<br />');
            });

            if (active !== '') {
                active = ''
            }
        });
    }

});