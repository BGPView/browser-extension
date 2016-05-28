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
                } else if (data.data.length < 1) {
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

        $.each( data.dns_records, function( index, value ){
            $("body").append('<strong>'+index+'</strong><br />');
            $.each(value, function( key, record ){
                $("body").append(record + '<br />');
            });
            $("body").append('<br />');
        });

        $("body").html(newHTML.join(""));
    }

});