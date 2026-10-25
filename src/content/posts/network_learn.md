---
title: network_learn
draft: true
---

第一周
────────────
OSI Model
Ethernet
MAC
ARP
IPv4
Subnet
TCP
UDP
DHCP
DNS


第二周
────────────
802.11
AP
STA
SSID
BSSID
2.4 GHz
5 GHz
Channel
Channel Width


第三周
────────────
RSSI
SNR
Noise Floor
dBm
MCS
PHY Rate
Airtime
Channel Utilization


第四周
────────────
CSMA/CA
CCA
CCI
ACI
Hidden Node
Retry Rate
Roaming


第五周
────────────
VLAN
802.1Q
Switch
Router
Firewall
ACL
WLC
PoE


第六周
────────────
Wireshark
iperf3
ping
mtr
tcpdump
Spectrum Analyzer


第七周
────────────
HTTP
MQTT
WebSocket
Nginx
Load Balancing
Connection Pool


第八周
────────────
Redis
Message Queue
Cache
Object Storage
CDN / Edge Cache
Rate Limiting
Backpressure



---


业务
│
├─ 10000 devices
│
├─ 7000 × 2.4GHz
├─ 3000 × 5GHz
│
├─ telemetry：333 req/s average
│
└─ model：最高可能 20TB / production batch
        ↓
────────────────────────────
无线容量模型
        ↓
每区域设备数
每Radio设备数
Airtime预算
Channel reuse
MCS / SNR / Retry
        ↓
────────────────────────────
AP / Access Switch
        ↓
Aggregation / Core
        ↓
────────────────────────────
Edge Cache / Model Distribution
        ↓
API / MQTT
        ↓
Load Balancer
        ↓
Application
        ↓
Queue / Redis
        ↓
Database
        ↓
────────────────────────────
Prometheus / Grafana / Logging