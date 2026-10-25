---
draft: false
path: /posts/computer/wsl2_NV_GPU_problem_solve.html
aliases:
  - /posts/acticle/wsl2_NV_GPU_problem_solve.html
terminalId: wsl2-cuda
title: WSL2 装了 CUDA，为什么还是找不到 GPU？
description: WSL2中使用 ls -l /dev/nvidia* 报错 No such file or directory
post_id: POST-000
date: 2026-08-29
kicker: COMPUTE / WSL2 / NVIDIA
category: computer
tags:
    - WSL2
    - CUDA
    - Linux系统
reading: 8
summary: WSL2 中 /dev/nvidia* 不存在不代表 GPU 不可用；误装裸机驱动包会导致 CUDA 段错误。
---

## 摘要

WSL2 中执行 `ls -l /dev/nvidia*` 报 `No such file or directory`，并不代表 GPU 不可用。WSL2 没有 PCI 直通，GPU 由 Windows 侧驱动通过 `/dev/dxg` 提供给 WSL2，`/dev/nvidia*` 节点本来就不是常态，判断 GPU 状态应以 `nvidia-smi` 为准。

本文记录的故障根因是：WSL2 内误装了 Ubuntu 源的裸机 NVIDIA 驱动包，导致系统库目录出现两套相互竞争的 NVIDIA 用户态库，CUDA 运行时发生混合加载，最终在执行 `cudaMalloc` 等操作时段错误。清理这些冲突包后，CUDA 恢复正常。

文章依次说明问题现象、环境诊断、解决方法和背后机理，并在最后给出 WSL2 内使用 GPU 的注意事项。

## 1. 问题背景与现象

### 1.1 问题环境

问题环境如下：
- 操作系统：Windows 11 + WSL2（WSL 2.7.3.0）+ Ubuntu 24.04
- GPU：NVIDIA GeForce RTX 4060 Laptop GPU

### 1.2 问题具体表现

问题最初的表现如下：

```bash
ls -l /dev/nvidia*
# 结果
ls: cannot access '/dev/nvidia*': No such file or directory
```

表面看像是 GPU 没有被 WSL2 识别。但经全面排查，真正的故障不是 GPU 不可用，而是 WSL2 内误装了 Ubuntu 源的裸机 NVIDIA 驱动包，导致 CUDA 运行时库版本混乱、CUDA 计算发生段错误。下面说明问题的产生过程。

### 1.3 问题产生过程

最初编译时提示缺少 CUDA Toolkit，于是在 Ubuntu 中安装了该套组件（Windows 侧已安装 CUDA 和 cuDNN，但版本与 Ubuntu 侧不同）。随后 Windows 端更新了 NVIDIA 显卡驱动，导致现有 CUDA Toolkit 出现问题，重新启动 llama.cpp 时发生 core dump。

为解决此问题，此次重新进行 CUDA 安装，并在 Ubuntu 内重新安装了显卡驱动。结果不仅 llama.cpp 无法启动，重新编译也无法完成，还出现了 1.2 节的问题。表面上系统无法识别显卡，但 `nvidia-smi` 仍能显示显卡状态，说明显卡本身在线。

---

## 2. 环境诊断

| 项目 | 值 |
|---|---|
| Windows NVIDIA 驱动 | 616.56 (KMD), CUDA UMD Version 13.4 |
| GPU | NVIDIA GeForce RTX 4060 Laptop GPU, 8GB, 0MiB 占用, 状态正常 |
| WSL 版本 | WSL 2.7.3.0, 内核 6.6.114.1-microsoft-standard-WSL2 |
| Ubuntu | 24.04, 内置 CUDA Toolkit 13.3 (nvcc 13.3.73) |
| Ubuntu 内误装的 apt 包 | `libnvidia-compute-580` (580.173.02)、`nvidia-utils-580`、`nvidia-utils-550` (550.163.01)、`nvidia-kernel-common-580`、`nvidia-firmware-580-580.173.02` |

> 其中 `libnvidia-compute-580 / nvidia-utils-* / nvidia-kernel-common-*` 是 Ubuntu 官方源（.deb 包）的裸机 Linux 驱动用户态组件，只能运行在独立安装 NVIDIA 驱动的 Linux 主机上，在 WSL2 中属于错误安装。

---

## 3. 解决方法

### 3.1 清理冲突包

```bash
sudo apt-get purge -y \
    libnvidia-compute-580 \
    nvidia-utils-580 \
    nvidia-utils-550 \
    nvidia-kernel-common-580 \
    nvidia-firmware-580-580.173.02
sudo ldconfig
```

移除约 452 MB 文件，仅影响上述 5 个包，不影响已安装的 CUDA Toolkit（cuda-toolkit-13-3、nvcc 13.3.73 等，保留完好）。

### 3.2 验证清理后效果

```bash
nvidia-smi
# NVIDIA-SMI 615.65.06 | KMD Version: 616.56 | CUDA UMD Version: 13.4   ← 版本与 Windows 侧一致

ldconfig -p | grep libcuda.so.1
# libcuda.so.1 (libc6,x86-64) => /usr/lib/wsl/lib/libcuda.so.1          ← 唯一目标, 无污染

ls /dev/
# 已出现 /dev/nvidiactl (char 195,255) 等兼容节点, 由 WSL 驱动栈创建

# CUDA 计算测试 (nvcc 13.3.73 编译, 运行)
cudaMalloc: no error
cudaMemset: no error
cudaMemcpy: no error   ← 此前相同程序段错误(exit 139), 现在全部通过

# Python ctypes 直接调 UMD
cuInit rc = 0 | device count = 1   ← GPU 可初始化且只有 1 块
```

修复后 `/dev/nvidia*` 节点出现、CUDA 计算正常、版本信息一致，问题彻底解决。

## 4. 机理解析

### 4.1 原理说明

该问题的根源在于 WSL2 调用硬件的方式与 Linux 实体机不同。WSL2 没有 PCI 直通，本质上是运行在 Hyper-V 虚拟机上的系统，GPU 通过 `/dev/dxg` 设备访问，驱动由 Windows 侧提供。WSL2 内看到的 GPU 是一个特殊设备，Windows 侧负责协调，WSL2 内不需要也不应该安装任何设备驱动。同时，WSL2 的内核模块与实机不同，现代 WSL2 采用 dxgkrnl + 用户态转发。

因此 `/dev/nvidia*` 节点缺失是正常现象，设备问题应由 Windows 侧统一解决。若在 WSL2 内安装驱动相关内容，在版本严格对齐的情况下可能短时间不会崩溃，但一旦与 Windows 侧驱动不匹配，就会导致相关服务崩溃——因为系统内存在两套指令版本，无法选择正确的逻辑与指令。

### 4.2 本次破坏操作

此前为了解决设备不存在的问题，安装了相关驱动。当时 Windows 侧驱动尚未更新，仍为 576 版本，Ubuntu 内安装了多个组件的裸机驱动包（580.173.02 和 550.163.01 两个版本）。

```bash
apt install nvidia-utils-580 libnvidia-compute-580 nvidia-kernel-common-580 nvidia-firmware-580-580.173.02 nvidia-utils-550
```

这些包会向 Ubuntu 的系统库目录写入一套与 WSL 无关的旧版用户态库：

```
/usr/lib/x86_64-linux-gnu/libcuda.so.1            → libcuda.so.580.173.02   (96MB 完整 UMD!)
/usr/lib/x86_64-linux-gnu/libnvidia-ptxjitcompiler.so.1  (580.173.02)
/usr/bin/nvidia-smi                                (580.173.02 版本二进制)
```

对裸机 Linux 这是正确的；但对 WSL2，这会导致系统内存在两套相互竞争的 NVIDIA 用户态库——WSL 驱动包提供的（615/616 系列）与 apt 提供的（580.173.02），开始互相污染。

### 4.3 破坏后情况

**现象 1：版本错乱**
系统 `ldconfig` 缓存里同时出现两个 `libcuda.so.1`：
```
/usr/lib/wsl/lib/libcuda.so.1          (正确, UMD 615.65.06)
/lib/x86_64-linux-gnu/libcuda.so.1     (错误, apt 580.173.02)
```
于是 `nvidia-smi` 显示 `NVIDIA-SMI 580.173.02 / Driver 616.56` 这种"半新半旧"的矛盾结果，误导排障。

**现象 2：混合加载 → CUDA 计算段错误（根因）**
用 `LD_DEBUG=libs` 观测到实际加载链：

```
calling init: /usr/local/cuda/targets/x86_64-linux/lib/libcudart.so.13      ← 本地 Toolkit, OK
calling init: /usr/lib/wsl/lib/libcuda.so.1                                 ← WSL 加载器, OK
calling init: /usr/lib/wsl/drivers/nvhqsi.*/libcuda.so.1.1                  ← Windows 驱动 UMD, OK
calling init: /lib/x86_64-linux-gnu/libnvidia-ptxjitcompiler.so.1           ← ★ 被 apt 580.173.02 劫持!!
```

WSL 真正的 UMD（615/616 系列）加载后，所依赖的 `libnvidia-ptxjitcompiler` 被系统搜索路径中的 580.173.02 版本抢先命中（而不是驱动包同目录中的同版库），JIT 编译器与 UMD 版本不匹配，导致运行时崩溃：

```
# 修复前实测
nvcc 编译 cuda_test.cu → 运行 → "Segmentation fault (core dumped)" exit 139
# 其中 cuInit 能过、nvidia-smi 能过, 只有真正执行 cudaMalloc/cudaMemset 时崩溃
```

**现象 3：`/dev/nvidia*` 设备节点不存在的"错觉"**
用户看到 `ls /dev/nvidia*` 报错，以为是 GPU 挂了。实际上：
- 新架构下 `/dev/nvidia*` 本来就不是常态（仅有 `/dev/dxg`）；
- 个别节点如 `/dev/nvidiactl` 是否出现取决于 WSL 驱动栈的初始化时机；
- 真正能反映故障的是"版本错乱 + 计算崩溃"，而不是设备节点。

**总结**：GPU、Windows 驱动、WSL 挂载链路全部健康；唯一被破坏的是 Ubuntu 内 `ldconfig` 库搜索链——apt 安装的 580.173.02 旧库劫持了 WSL UMD 的依赖解析，导致混合版本加载和段错误。`ls /dev/nvidia*` 报错只是"正好碰到没有该节点"的巧合，本身无害但具有误导性。


## 5. 总结与后续预防

### 5.1 总结

本次问题的完整链路是：WSL2 内误装 Ubuntu 源的裸机 NVIDIA 驱动包 → 系统库目录出现两套 NVIDIA 用户态库 → `ldconfig` 搜索链被旧版库劫持 → CUDA 运行时混合加载 → 执行 `cudaMalloc` 等操作时段错误。清理冲突包后，`/dev/nvidia*` 节点恢复、CUDA 计算正常、版本信息与 Windows 侧一致。

核心结论：
1. WSL2 的 GPU 由 Windows 侧驱动提供，`/dev/nvidia*` 节点缺失不代表 GPU 不可用，判断 GPU 状态应以 `nvidia-smi` 为准。
2. WSL2 内不要安装任何裸机 NVIDIA 驱动包，否则会造成用户态库污染，导致 CUDA 段错误。
3. 排查 CUDA 问题时，先检查 `ldconfig` 中是否存在重复的 `libcuda.so.1`，再检查加载链是否被劫持。

### 5.2 后续注意

1. **WSL2 内永远不要安装** `nvidia-driver-* / nvidia-utils-* / libnvidia-compute-* / nvidia-kernel-common-* / nvidia-firmware-*` 等 apt 裸机驱动包——它们只适用于纯 Linux 主机。WSL2 的 GPU 栈完全由 Windows 侧驱动 + `/usr/lib/wsl` 挂载提供。
2. WSL2 内只需要安装必要组件：
   - 编译工具链：`nvcc` / `cuda-toolkit-13-3`（已装，正常）；
   - 应用库：torch / 其它框架；
   - 驱动升级一律在 Windows 侧进行，WSL2 自动挂载新库，无需任何操作。
3. 检查 GPU 是否存在，用以下任一方式，不要用 `ls /dev/nvidia*`：
   ```bash
   nvidia-smi                     # 查看 KMD/UMD 版本是否与 Windows 一致
   nvidia-smi -L                  # 列出 GPU
   python3 -c "import ctypes; l=ctypes.CDLL('libcuda.so.1'); print(l.cuInit(0))"   # 0 即成功
   ```
4. 若日后 CUDA 程序段错误或报 driver mismatch，先检查：
   ```bash
   LD_DEBUG=libs 你的程序 2>&1 | grep -E "libcuda|libnvidia"   # 看有无混合加载
   ldconfig -p | grep -E "libcuda|libnvidia"                    # 看有无重复/多版本条目
   ```