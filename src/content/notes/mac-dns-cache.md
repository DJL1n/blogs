---
title: 'Mac 上刷新 DNS 缓存'
date: '2026-05-03'
updated: '2026-05-03'
summary: '记录 macOS 下刷新 DNS 缓存的常用命令与应用场景。'
tags: ['macOS', 'network', 'dns']
category: '技巧'
type: 'note'
importance: 2
draft: false
---

有时出现域名解析异常时，可以刷新本地 DNS 缓存：

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

对近期版本 macOS 通常适用。
