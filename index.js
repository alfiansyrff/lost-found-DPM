const {
    default: makeWASocket,
	MessageType, 
    MessageOptions, 
    Mimetype,
	DisconnectReason,
    useSingleFileAuthState
} = require("@adiwajshing/baileys");

const { Boom } =require("@hapi/boom");
const {state, saveState} = useSingleFileAuthState("./auth_info.json");
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const express = require("express");
const bodyParser = require("body-parser");
const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const axios = require("axios");
const port = process.env.PORT || 8000;
const BASE_URL = "https://script.google.com/macros/s/AKfycbwY6imMrZJt3e2s5bjeHP9X4oppDFfAu_Vl9apxSheXUjPPKiSsbtYZkfr8-ULkAcMM/exec?";

async function connectToWhatsApp() {
    
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
           let reason = new Boom(lastDisconnect.error).output.statusCode;
			if (reason === DisconnectReason.badSession) {
				console.log("Bad Session File, Please Delete file session and Scan Again");
				sock.logout();
				if (fs.existsSync('auth_info.json')) {
					fs.unlink('auth_info.json', (err) => {
						if (err) throw err;
						console.log('File deleted!');
					});
				};
				connectToWhatsApp();
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log("Connection closed, reconnecting....");
				connectToWhatsApp();
			} else if (reason === DisconnectReason.connectionLost) {
				console.log("Connection Lost from Server, reconnecting...");
				connectToWhatsApp();
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First");
				sock.logout();
			} else if (reason === DisconnectReason.loggedOut) {
				console.log("Device Logged Out, Please Delete sesion and Scan Again.");
				sock.logout();
				if (fs.existsSync('auth_info.json')) {
					fs.unlink('auth_info.json', function (err) {
						if (err) throw err;
						console.log('File deleted!');
					});
				};
				connectToWhatsApp();
			} else if (reason === DisconnectReason.restartRequired) {
				console.log("Restart Required, Restarting...");
				connectToWhatsApp();
			} else if (reason === DisconnectReason.timedOut) {
				console.log("Connection TimedOut, Reconnecting...");
				connectToWhatsApp();
			} else {
				sock.end(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`);				
			}
        } else if(connection === 'open') {
            console.log('opened connection');
        }
    });

    sock.ev.on("creds.update", saveState);

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        
        console.log(messages);
        
        if(type === "notify"){
            if(!messages[0].key.fromMe && !messages[0].key.participant) {

                //tentukan jenis pesan berbentuk text                
                const pesan = messages[0].message.conversation;
                //tentukan jenis pesan apakah bentuk list
                const responseList = messages[0].message.listResponseMessage;
                //tentukan jenis pesan apakah bentuk button
                const responseButton = messages[0].message.buttonsResponseMessage;
                
				//tentukan jenis pesan apakah bentuk templateButtonReplyMessage
                const responseReplyButton = messages[0].message.templateButtonReplyMessage;
                
				//nowa dari pengirim pesan sebagai id
                const noWa = messages[0].key.remoteJid;

                // username wa pengirim
                const usernameWA = messages[0].pushName;
                
				await sock.readMessages([messages[0].key]);
                //kecilkan semua pesan yang masuk lowercase 
                const pesanMasuk = pesan.toLowerCase();
                // Cek apakah sender kirim foto
                const messageType = Object.keys(messages[0].message)[0]


                if(!messages[0].key.fromMe && pesanMasuk === "dpm"){
                    await sock.sendMessage(noWa, {text: "Viva Legislativa! 🖖"},{quoted: messages[0] });
                }
                else if(!messages[0].key.fromMe && pesanMasuk === "menu") {

                    const jenismenu = [{
                            title : 'Pilih Layanan', 
                            rows :[
                                {
                                    title: "Buat Laporan (Kehilangan / Penemuan)",
                                    rowId: '1'
                                }, 
                                {
                                    title: "Cek Barang Hilang",
                                    rowId: '2'
                                },
                                {
                                    title: "Cek Penemuan Barang",
                                    rowId: '3'
                                }
                            ]
                    }
                    ]

                    const listPesan = {
                        text: `Selamat datang di layanan pelaporan barang milik *DPM POLSTAT STIS*.\n\n Silahkan pilih menu berikut: `,
                        title: `Halo *${usernameWA}*,`,
                        buttonText: "Tampilkan Menu",
                        sections : jenismenu,
						viewOnce:true
                    }
                    
                    await sock.sendMessage(noWa, listPesan, {quoted: messages[0]});
                }  
                // response jika kirim image
                else if (messageType === 'imageMessage') {
                    await sock.sendMessage(noWa, {text: "Mohon maaf, kami belum bisa menerima kiriman dalam bentuk gambar😔"})
                } 
                
                // response menu list
                else if (!messages[0].key.fromMe && responseList){

                    //cek row id yang dipilih 
                    const pilihanlist = responseList.singleSelectReply.selectedRowId;
                    
                    if(pilihanlist == 1) {
                        const buttons = [
                            {buttonId: "kehilangan", buttonText: {displayText: 'Kehilangan barang'}, type: 1},
                            {buttonId: "penemuan", buttonText: {displayText: 'Penemuan barang'}, type: 1},
                        ]
                        const buttonInfo = {
                            text: `Untuk membuat laporan, Silahkan pilih jenis laporan yang dibuat: \n`,
                            footer: '© DPM POLSTAT STIS 2022-2023',
                            buttons: buttons,
                            headerType: 1,
                            viewOnce:true
                        }
                        await sock.sendMessage(noWa, buttonInfo, {quoted: messages[0]});
                    }
                    else if (pilihanlist == 2) {
                        await sock.sendMessage(noWa, { text: "Berikut ini data barang yang hilang: "});
                        await sock.sendMessage(noWa, { text: "_memuat data..._"});

                        // REQ API Cek barang yang hilang
                        axios.get(`${BASE_URL}action=cek&jenis=kehilangan`)
                          .then(async (response) => {
                            let {success, data} = response.data;
                            if (success) {
                                for (let i = 0; i < data.length; i++) {
                                    await sock.sendMessage(noWa, {text: `*Barang ke-${i+1}* \n\n *1️⃣id barang*: ${data[i]["id"]} \n\n *2️⃣Barang hilang* : ${data[i]["barang"]} \n\n *3️⃣Detail barang* : ${data[i]["detail"]} \n\n *4️⃣Foto*: ${data[i]["foto"]} \n\n *5️⃣Lokasi kehilangan*: ${data[i]["tempat"]} \n\n *6️⃣Waktu kehilangan*: ${data[i]["waktu"]} \n\n *7️⃣Whatsapp yang dapat dihubungi*: wa.me/${data[i]["whatsapp"]} (${data[i]["nama"]})`})
                                }
                            } else {
                                await sock.sendMessage("Kabar bagus! *ternyata tidak ada data barang kehilangan* 😉");
                            }
                            })

                    }
                    else if (pilihanlist == 3) {
                        await sock.sendMessage(noWa, { text: "Berikut ini data barang yang ditemukan: "});
                        await sock.sendMessage(noWa, { text: "_memuat data..._"});
                        // REQ API cek barang ditemukan
                        axios.get(`${BASE_URL}action=cek&jenis=penemuan`)
                          .then(async (response) => {
                            let {success, data} = response.data;
                            if (success) {
                                for (let i = 0; i < data.length; i++) {
                                    await sock.sendMessage(noWa, {text: `*Barang ke-${i+1}* \n\n *1️⃣id barang*: ${data[i]["id"]} \n\n *2️⃣Barang yang ditemukan* : ${data[i]["barang"]} \n\n *3️⃣Detail barang* : ${data[i]["detail"]} \n\n *4️⃣Foto*: ${data[i]["foto"]} \n\n *5️⃣Lokasi penemuan* : ${data[i]["tempat"]} \n\n *6️⃣Waktu penemuan*: ${data[i]["waktu"]} \n\n *7️⃣Whatsapp yang dapat dihubungi*: wa.me/${data[i]["whatsapp"]} (${data[i]["nama"]})`})
                                }
                            } else {
                                await sock.sendMessage("*Tidak ditemukan data barang penemuan*");
                            }
                            })

                    }
                    else{
                        await sock.sendMessage(noWa, {text: "Pilihan Invalid!"},{quoted: messages[0] });
                    }    
                } 
                // response button
                else if(!messages[0].key.fromMe && responseButton){

                    //console.log(responseButton);
                    
                    if(responseButton.selectedButtonId == "kehilangan"){
                        await sock.sendMessage(noWa, {
                            text:"Silahkan buat laporan kehilangan.\nIsi sesuai template berikut: \n \nNama pelapor: \nbarang yang hilang: \nlokasi terakhir terlihat: \nwaktu kehilangan (opsional): \ndetail barang: \nfoto barang (opsional): \n \n*_Bagian foto diisi dengan link gdrive yang dapat diakses_* \n \n*_Salin pesan ini dan masukkan data sesuai format_*"
                        });  
                    }else if(responseButton.selectedButtonId == "penemuan"){
                        await sock.sendMessage(noWa, {
                            text:"Silahkan buat laporan penemuan. \nIsi sesuai template berikut: \n \nNama pelapor: \nbarang yang ditemukan: \nlokasi penemuan: \nwaktu penemuan (opsional): \ndetail barang: \nfoto barang: \n \n*_Bagian foto diisi dengan link gdrive yang dapat diakses_* \n \n*_Salin pesan ini dan masukkan data sesuai format_*" 
                        });  
                    }
                    else{
                        await sock.sendMessage(noWa, {
                            text: "Tombol invalid"
                        });
                    } 
                    
                }    
                // REQ API Buat laporan kehilangan 
                else if (messages[0].message.conversation.includes("Silahkan buat laporan kehilangan")) {
                    let keys = ["Nama pelapor:", "barang yang hilang:", "lokasi terakhir terlihat:", "waktu kehilangan (opsional):", "detail barang:", "foto barang (opsional):"];
                    let values = [];

                    keys.forEach(key => {
                    let startIndex = messages[0].message.conversation.indexOf(key) + key.length;
                    let endIndex = messages[0].message.conversation.indexOf("\n", startIndex);
                    let value = messages[0].message.conversation.substring(startIndex, endIndex);
                    values.push(value);
                    });
                    // console.log(values);
                    axios.get(`${BASE_URL}action=laporan&jenis=kehilangan&nama=${values[0]}&whatsapp=${noWa.replace("@s.whatsapp.net", "")}&tempat=${values[2]}&waktu=${values[3]}&detail=${values[4]}&barang=${values[1]}&foto=${values[5]}`)
                      .then(async (response) => {
                        let {success, data, message} = response.data;
                        if (success) {
                            await sock.sendMessage(noWa, {text: message});
                      } else {
                        await sock.sendMessage(noWa, {text: "Mohon kirim ulang laporan, pastikan sudah sesuai dengan format yang ditentukan"});
                      }
                    })
                }
                // REQ API buat laporan penemuan
                else if (messages[0].message.conversation.includes("Silahkan buat laporan penemuan")) {
                    let keys = ["Nama pelapor:", "barang yang ditemukan:", "lokasi penemuan:", "waktu penemuan:", "detail barang:", "foto barang:"];
                    let values = [];

                    keys.forEach(key => {
                    let startIndex = messages[0].message.conversation.indexOf(key) + key.length;
                    let endIndex = messages[0].message.conversation.indexOf("\n", startIndex);
                    let value = messages[0].message.conversation.substring(startIndex, endIndex);
                    values.push(value);
                    });
                  
                    axios.get(`${BASE_URL}action=laporan&jenis=penemuan&nama=${values[0]}&whatsapp=${noWa.replace("@s.whatsapp.net", "")}&tempat=${values[2]}&waktu=${values[3]}&detail=${values[4]}&barang=${values[1]}&foto=${values[5]}`)
                      .then(async (response) => {
                        let {success, data, message} = response.data;
                        if (success) {
                            await sock.sendMessage(noWa, {text: message});
                      } else {
                        await sock.sendMessage(noWa, {text: "Mohon kirim ulang laporan, pastikan sudah sesuai dengan format yang ditentukan"});
                      }
                    })
                }

				else{
                    await sock.sendMessage(noWa, {text: `Halo *${usernameWA}* 👋, ketik "menu" untuk menampilkan menu ya 😉`},{quoted: messages[0] });
                }
            }		
		}

    });

}
// run in main file
connectToWhatsApp()
.catch (err => console.log("unexpected error: " + err) ) // catch any errors

server.listen(port, () => {
  console.log("Server Berjalan pada Port : " + port);
});
