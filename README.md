# little-ai-pal

# Raspberry-pi

## PCとのUSB接続でネット共有

config.textの頭に追加
```bash
rootwait modules-load=dwc2,g_ether
```

末端に追加
```bash
dtoverlay=dwc2
```

cmdline.txtのrootwaitのあとに追加
```bash
modules-load=dwc2,g_ether
```

Alsa関連
```bash
sudo apt-get install alsa-utils libasound2 libasound2-dev
```

## 日本語化

https://qiita.com/ryot0/items/3c246e1e673e00d07ddc

https://zenn.dev/kusaremkn/articles/428c4cd34e4ff9

追加で`font-size=16`など指定可能

## スピーカーから音声出力できない場合のTips

実行後、raspi-configがremoveされるので再度インストールが必要。
ssh設定有効化もなくなるので、raspi-configで再度有効化。

```bash
sudo apt-get remove --purge pulseaudio
sudo reboot
```

```bash
sudo apt-get remove --purge alsa-utils
sudo apt-get clean
sudo apt-get autoremove
sudo apt-get update
sudo apt-get install alsa-utils
sudo reboot
```

/boot/firmware/config.txtに以下の記載があるか確認

```bash
dtparam=audio=on
```

## voicevox-engineのdockerコンテナ作成

```bash
sudo apt-get install docker.io
sudo apt-get install docker-compose
```

# クライアント環境

## Speech Service(Linux)

```bash
sudo apt-get update
sudo apt-get install build-essential libssl-dev ca-certificates libasound2 wget
```

Raspberry pi（Debian系）でデフォルトで入っているOpenSSL3.0はサポートされていない。
古いのを持ってくる。

```bash
sudo wget http://ports.ubuntu.com/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_arm64.deb
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2_arm64.deb
```

## PyAudioのインストール

PyAudioの依存ライブラリ等のインストールが必要

```bash
sudo apt-get update
sudo apt-get install -y python3-dev python3-pip portaudio19-dev
```

