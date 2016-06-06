# BGPView (Multi) Browser Extension

### A Kango extensions framework built project. A detailed way to debug and investigate information about IP addresses, ASN, IXs, BGP, ISPs, Prefixes and Domain names.

### This extension will allow you to see detailed information about the current website that you are browsing.

----
You will be able to see such things as DNS records, GeoIP, whois records, ISP and Prefix Names, ASN upstreams, peering and routing.

See what other IP prefixes the ISPs are announcing and how much BGP presence they have.

----
Display of the current website DNS records

![Image of DNS records](http://i.imgur.com/4TDFqXp.png)
----
Display of a selected Prefix and its allocation and Origin ASN information

![Image of Prefix](http://i.imgur.com/aRIGdkW.png)
----
Display of an ASN's set of upstream providers

![Image of ASN Upstreams](http://i.imgur.com/WJtohJz.png)
----
Display all the Internet Exchanges (IX) that an ISP is part of

![Image of ASN IXs](http://i.imgur.com/21ifM5U.png)
----

## To build extension you will need to download the latest copy of the kangoextensions library and run the following:

 ```
 python kango.py build browser-extension
 ```
 