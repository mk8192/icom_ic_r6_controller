const { createApp } = Vue;

// 送信データ（バイナリ配列）
const PA = [0xFE, 0xFE];
const RA = [0x7E];
const TA = [0xE0];
const EM = [0xFD];
const CMD_GET_FREQ = [0x03];
const CMD_SET_FREQ = [0x00];

createApp({
    data() {
        return {
            //初期化データ
            groupdata: groupdata,
            freqdata: freqdata,
            airportData: airportData,
            //シリアル接続のデータ
            port: null,
            reader: null,
            writer: null,
            //表示
            frequencyDisplay: "--,---",
            //でーた
            airport: 'HND',
            currentFreq: 0,
            showMapImage: true,
            showSetting: false,
            //設定画面用データ
            selectedGroupItem: null,
        };
    },
    mounted() {
        // アプリケーション起動時にlocalStorageからデータを読み込み
        this.loadGroupDataFromStorage();
    },
    methods: {
        window: onload = function () {
            // ウィンドウを閉じるときにポートを閉じる
            window.addEventListener('beforeunload', async () => {
                if (this.port) {
                    if (this.reader) {
                        this.reader.releaseLock();
                    }
                    if (this.writer) {
                        this.writer.releaseLock();
                    }
                    await this.port.close();
                }
            });
        },
        connectSerial: async function () {
            if (!this.port) {
                // ポート選択と接続
                try {
                    this.port = await navigator.serial.requestPort();
                    const baudRate = parseInt(document.getElementById('baudrate').value, 10);
                    await this.port.open({ baudRate: baudRate || 9600 });

                    this.writer = this.port.writable.getWriter();
                    this.reader = this.port.readable.getReader();

                    // データ受信処理
                    let buffer = [];
                    let dataRecvPhase = 0;
                    while (true) {
                        const { value, done } = await this.reader.read();
                        if (done) {
                            break;
                        }

                        if (value == 0xFE && dataRecvPhase == 0) {
                            dataRecvPhase = 1;
                        } else if (value == 0xFE && dataRecvPhase == 1) {
                            dataRecvPhase = 2;
                        } else if (value != 0xFD && dataRecvPhase == 2) {
                            buffer.push(value);
                        } else if (value == 0xFD && dataRecvPhase == 2) {
                            //ここに処理を記載
                            this.recv(buffer);
                            buffer = [];
                            dataRecvPhase = 0;
                        }
                    }
                } catch (error) {
                    alert('Error: ' + error);
                }
            }
        },
        onClickFreqButton: function (freq) {
            // data-freq 属性から周波数を取得してMHzからHzに変換
            let freqMHz = parseFloat(freq);
            let freqHz = freqMHz * 1000000;  // MHz → Hz
            this.setFreq(parseInt(freqHz, 10));  // 周波数を整数に変換して送信
        },
        setFreq: async function (freq) {
            if (this.port) {
                // ポート選択と接続
                try {

                    // データ送信
                    let freqData = convertNumberToBytes(freq);
                    const sendData = new Uint8Array([...PA, ...RA, ...TA, ...CMD_SET_FREQ, ...freqData, ...EM]);
                    await this.writer.write(sendData);
                    console.log('[送信]' + ba2hex(sendData));
                } catch (error) {
                    alert('Error: ' + error);
                }
            } else {
                return false;
            }
        },
        recv: function (recvData) {
            console.log('[受信]' + ba2hex(recvData));
            let cmd = Number(recvData[2]);
            //コマンド、サブコマンドを除去
            let data = recvData.splice(3);
            switch (cmd) {
                case 0x00:
                    //0x00 周波数
                    let freq = convertBytesToNumber(data);
                    console.log('[受信]周波数設定 : ' + freq);
                    this.frequencyDisplay = (freq / 1000000).toFixed(3);
                    this.currentFreq = (freq / 1000000);
            }
        },
        getAreaList: function (group) {
            return [...new Set(this.freqdata.filter(f => f.group === group).map(f => f.area))];
        },
        getSectionName: function () {
            let groups = this.groupdata.find(g => g.airport === this.airport).group;
            let sectionName = (freqdata.find(f => f.freq === this.currentFreq && groups.includes(f.group)) ?? { section: "" }).section;
            if (sectionName === '') {
                return "";
            }
            return "【" + sectionName + "】";
        },
        getGroupNameByCode: function (group) {
            return this.airportData[group].name ?? group;
        },
        // localStorage関連メソッド
        loadGroupDataFromStorage: function () {
            try {
                const saved = localStorage.getItem('icr6_groupdata');
                if (saved) {
                    const parsedData = JSON.parse(saved);
                    if (parsedData && parsedData.length > 0) {
                        this.groupdata = parsedData;
                        console.log('localStorageからグループデータを読み込みました');
                    }
                }
            } catch (error) {
                console.error('localStorageからのデータ読み込みに失敗しました:', error);
            }
        },
        saveGroupDataToStorage: function () {
            try {
                localStorage.setItem('icr6_groupdata', JSON.stringify(this.groupdata));
                console.log('グループデータをlocalStorageに保存しました');
            } catch (error) {
                console.error('localStorageへのデータ保存に失敗しました:', error);
            }
        },
        resetGroupDataToDefault: function () {
            // デフォルトのグループデータを復元
            this.groupdata = groupdata;
            this.saveGroupDataToStorage();
            this.selectedGroupItem = null;
        },
        // 設定画面用メソッド
        selectGroupItem: function (item) {
            this.selectedGroupItem = item;
        },
        getAvailableGroups: function () {
            if (!this.selectedGroupItem) return [];

            // freqdataからユニークなgroupを抽出
            const allGroups = [...new Set(this.freqdata.map(f => f.group))];

            // 現在選択されているグループアイテムに含まれていないgroupを返す
            return allGroups.filter(group => !this.selectedGroupItem.group.includes(group));
        },
        addGroupToSelected: function (group) {
            if (this.selectedGroupItem && !this.selectedGroupItem.group.includes(group)) {
                this.selectedGroupItem.group.push(group);
                this.saveGroupDataToStorage(); // 変更をlocalStorageに保存
            }
        },
        removeGroupFromSelected: function (group) {
            if (this.selectedGroupItem) {
                const index = this.selectedGroupItem.group.indexOf(group);
                if (index > -1) {
                    this.selectedGroupItem.group.splice(index, 1);
                    this.saveGroupDataToStorage(); // 変更をlocalStorageに保存
                }
            }
        },
        debug: function () {
            debugger;

        }
    }
}).mount('#app');