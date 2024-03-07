Module.register("MMM-bussi", {
    defaults: {
        updateInterval: 10000, // päivitysväli millisekunteina, tässä 10000ms (10 sekuntia)
    },

    start: function () {
        var self = this;

        // Aloita odottamalla ensimmäistä bussia
        this.odotaEnsimmaistaBussia();

        // Aseta sitten säännöllinen päivitysväli
        setInterval(function () {
            self.haeJaTulostaBussiAikataulu();
        }, this.config.updateInterval);
    },

    odotaEnsimmaistaBussia: function () {
        // Hae aikataulu ja tarkista, onko ensimmäinen bussi lähtenyt
        const ensimmainenBussiLahtenyt = this.tarkistaEnsimmainenBussiLahtenyt();

        if (ensimmainenBussiLahtenyt) {
            // Ensimmainen bussi on jo lähtenyt, päivitä nyt
            this.haeJaTulostaBussiAikataulu();
        } else {
            // Odota jonkin aikaa ja yritä uudelleen
            setTimeout(() => {
                this.odotaEnsimmaistaBussia();
            }, 5000); // Odota 5 sekuntia ennen seuraavaa yritystä
        }
    },

    tarkistaEnsimmainenBussiLahtenyt: function () {
        // Tarkista täällä, onko ensimmäinen bussi lähtenyt
        // Voit käyttää aikatauluja tai reaaliaikaista tietoa tässä
        // Palauta true, jos ensimmäinen bussi on lähtenyt, muuten false
        return true; // Tämä on vain esimerkki, muuta tarpeidesi mukaan
    },

    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.id = "bussiAikataulu";
        this.haeJaTulostaBussiAikataulu(wrapper);
        return wrapper;
    },

    haeJaTulostaBussiAikataulu: async function (wrapper) {
        if (!wrapper) {
            wrapper = document.getElementById("bussiAikataulu");
            if (!wrapper) {
                return;
            }
        }

        // Poista vanhat tiedot ennen uusien lisäämistä
        wrapper.innerHTML = "";

        // Kopioi tämänhetkinen aika
        const nykyinenAika = new Date();

        // Ota käyttöön haeLaehimmaetPysaekit-funktio, joka hakee lähimmät pysäkit
        const pysakit = await this.haeLaehimmaetPysaekit();

        if (!pysakit) {
            return;
        }

        const kaikkiAikataulut = [];
        let edellinenPysakki = null;

        for (const pysakki of pysakit) {
            const pysakinTiedot = pysakki.node.place;
            const pysakinNimi = pysakinTiedot.name.replace("Pori", "").replace("Matkakeskus", "").replace("matkakeskus", "").replace(",", "").replace("laituri", "").trim();
            const aikataulut = pysakinTiedot.stoptimesWithoutPatterns || [];

            for (const aikataulu of aikataulut) {
                aikataulu.pysakinNimi = pysakinNimi;
                kaikkiAikataulut.push(aikataulu);
            }
        }

        kaikkiAikataulut.sort((a, b) => a.scheduledArrival - b.scheduledArrival);

        for (const aikataulu of kaikkiAikataulut) {
            const pysakinNimi = aikataulu.pysakinNimi;
            const reitinLyhytNimi = aikataulu.trip.route.shortName;
            const reitinPitkaNimi = aikataulu.trip.route.longName;
            const aikataulunSaapuminen = aikataulu.scheduledArrival;
            const reaaliaikainenSaapuminen = aikataulu.realtimeArrival;
            const laehtoViive = aikataulu.departureDelay;
            const palvelupaiva = aikataulu.serviceDay;
            const pysakinJaerjestys = aikataulu.stopSequence;

            let saapumisaika;

            if (reaaliaikainenSaapuminen) {
                saapumisaika = reaaliaikainenSaapuminen;
                if (laehtoViive > 0 && laehtoViive <= 5) {
                    const viesti = `Bussi ${reitinLyhytNimi} (${reitinPitkaNimi}) on myöhässä ${laehtoViive} minuuttia pysäkillä ${pysakinNimi}.`;
                    this.tulostaViesti(viesti, wrapper);
                }
            } else {
                saapumisaika = aikataulunSaapuminen;
            }

            const muotoiltuAikataulunSaapuminen = this.muotoileAika(saapumisaika);

            if (muotoiltuAikataulunSaapuminen > nykyinenAika.toISOString().slice(11, 19)) {
                const aikataulunPvm = new Date(saapumisaika * 1000 + palvelupaiva);
                const nykyinenPvm = new Date();

                if (edellinenPysakki && edellinenPysakki.trip.route.shortName === reitinLyhytNimi) {
                    continue;
                } else if (aikataulunPvm.toISOString().slice(0, 10) !== nykyinenPvm.toISOString().slice(0, 10)) {
                    const viesti = `${pysakinNimi}, ${reitinLyhytNimi}, ${reitinPitkaNimi}, Lähtö: ${muotoiltuAikataulunSaapuminen}`;
                    this.tulostaViesti(viesti, wrapper);
                } else if (aikataulu.length && pysakinJaerjestys === 1) {
                    const viesti = `${pysakinNimi}, ${reitinLyhytNimi}, ${reitinPitkaNimi}, Lähtö: ${muotoiltuAikataulunSaapuminen}`;
                    this.tulostaViesti(viesti, wrapper);
                } else if (aikataulu.length && pysakinJaerjestys === aikataulu[aikataulu.length - 1].stopSequence) {
                    const viesti = `${pysakinNimi}, ${reitinLyhytNimi}, ${reitinPitkaNimi}, Arvioitu saapuminen: ${muotoiltuAikataulunSaapuminen}`;
                    this.tulostaViesti(viesti, wrapper);
                } else if (reitinLyhytNimi === "1") {
                    const viesti = `${pysakinNimi}LINJA, Arvioitu saapuminen: ${muotoiltuAikataulunSaapuminen}`;
                    this.tulostaViesti(viesti, wrapper);
                } else {
                    const viesti = `${pysakinNimi}, ${reitinLyhytNimi}, ${reitinPitkaNimi}, Arvioitu saapuminen: ${muotoiltuAikataulunSaapuminen}`;
                    this.tulostaViesti(viesti, wrapper);
                }

                edellinenPysakki = aikataulu;
            } else {
                console.log(`Virhe: Aikataulu meni jo ohi`);
            }
        }
    },
	    getStyles: function () {
        return [
            'styles.css', 
        ];
    },

    muotoileAika: function (sekunnit) {
        const tunnit = Math.floor(sekunnit / 3600);
        const jaannos = sekunnit % 3600;
        const minuutit = Math.floor(jaannos / 60);
        const sekunnitJaljella = jaannos % 60;
        return `${tunnit.toString().padStart(2, '0')}:${minuutit.toString().padStart(2, '0')}:${sekunnitJaljella.toString().padStart(2, '0')}`;
    },

 

    tulostaViesti: function (viesti, wrapper) {
        // Tämä funktio lisää viestin Magic Mirrorin näytölle
        const viestiElementti = document.createElement('div');
        viestiElementti.innerHTML = viesti;
        wrapper.appendChild(viestiElementti);
    }
});Module.register("MMM-bussi", {
    defaults: {
        updateInterval: 10000, // päivitysväli millisekunteina, tässä 10000ms (10 sekuntia)
    },

    start: function () {
        var self = this;

        // Aloita odottamalla ensimmäistä bussia
        this.odotaEnsimmaistaBussia();

        // Aseta sitten säännöllinen päivitysväli
        setInterval(function () {
            self.haeJaTulostaBussiAikataulu();
        }, this.config.updateInterval);
    },

    odotaEnsimmaistaBussia: function () {
        // Hae aikataulu ja tarkista, onko ensimmäinen bussi lähtenyt
        const ensimmainenBussiLahtenyt = this.tarkistaEnsimmainenBussiLahtenyt();

        if (ensimmainenBussiLahtenyt) {
            // Ensimmainen bussi on jo lähtenyt, päivitä nyt
            this.haeJaTulostaBussiAikataulu();
        } else {
            // Odota jonkin aikaa ja yritä uudelleen
            setTimeout(() => {
                this.odotaEnsimmaistaBussia();
            }, 5000); // Odota 5 sekuntia ennen seuraavaa yritystä
        }
    },

    tarkistaEnsimmainenBussiLahtenyt: function () {
        // Tarkista täällä, onko ensimmäinen bussi lähtenyt
        // Voit käyttää aikatauluja tai reaaliaikaista tietoa tässä
        // Palauta true, jos ensimmäinen bussi on lähtenyt, muuten false
        return true; // Tämä on vain esimerkki, muuta tarpeidesi mukaan
    },

    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.id = "bussiAikataulu";
        this.haeJaTulostaBussiAikataulu(wrapper);
        return wrapper;
    },

    haeJaTulostaBussiAikataulu: async function (wrapper) {
        if (!wrapper) {
            wrapper = document.getElementById("bussiAikataulu");
            if (!wrapper) {
                return;
            }
        }

        // Poista vanhat tiedot ennen uusien lisäämistä
        wrapper.innerHTML = "";

        // Kopioi tämänhetkinen aika
        const nykyinenAika = new Date();

        // Ota käyttöön haeLaehimmaetPysaekit-funktio, joka hakee lähimmät pysäkit
        const pysakit = await this.haeLaehimmaetPysaekit();

        if (!pysakit) {
            return;
        }

        const kaikkiAikataulut = [];
        let edellinenPysakki = null;

        for (const pysakki of pysakit) {
            const pysakinTiedot = pysakki.node.place;
            const pysakinNimi = pysakinTiedot.name.replace("Pori", "").replace("Matkakeskus", "").replace("matkakeskus", "").replace(",", "").replace("laituri", "").trim();
            const aikataulut = pysakinTiedot.stoptimesWithoutPatterns || [];

            for (const aikataulu of aikataulut) {
                aikataulu.pysakinNimi = pysakinNimi;
                kaikkiAikataulut.push(aikataulu);
            }
        }

        kaikkiAikataulut.sort((a, b) => a.scheduledArrival - b.scheduledArrival);

        for (const aikataulu of kaikkiAikataulut) {
            const pysakinNimi = aikataulu.pysakinNimi;
            const reitinLyhytNimi = aikataulu.trip.route.shortName;
            const reitinPitkaNimi = aikataulu.trip.route.longName;
            const aikataulunSaapuminen = aikataulu.scheduledArrival;
            const reaaliaikainenSaapuminen = aikataulu.realtimeArrival;
            const laehtoViive = aikataulu.departureDelay;
            const palvelupaiva = aikataulu.serviceDay;
            const pysakinJaerjestys = aikataulu.stopSequence;

            let saapumisaika;

            if (reaaliaikainenSaapuminen) {
                saapumisaika = reaaliaikainenSaapuminen;
                if (laehtoViive > 0 && laehtoViive <= 5) {
                    const viesti = `Bussi ${reitinLyhytNimi} (${reitinPitkaNimi}) on myöhässä ${laehtoViive} minuuttia pysäkillä ${pysakinNimi}.`;
                    this.tulostaViesti(viesti, wrapper);
                }
            } else {
                saapumisaika = aikataulunSaapuminen;
            }

            const muotoiltuAikataulunSaapuminen = this.muotoileAika(saapumisaika);

            if (muotoiltuAikataulunSaapuminen > nykyinenAika.toISOString().slice(11, 19)) {
                const aikataulunPvm = new Date(saapumisaika * 1000 + palvelupaiva);
                const nykyinenPvm = new Date();

                if (edellinenPysakki && edellinenPysakki.trip.route.shortName === reitinLyhytNimi) {
                    continue;
                } else if (aikataulunPvm.toISOString().slice(0, 10) !== nykyinenPvm.toISOString().slice(0, 10)) {
                    const viesti = `${pysakinNimi}, ${reitinLyhytNimi}, ${reitinPitkaNimi}, Lähtö: ${muotoiltuAikataulunSaapuminen}`;
                    this.tulostaViesti(viesti, wrapper);
                } else if (aikataulu.length && pysakinJaerjestys === 1) {
                    const viesti = `${pysakinNimi}, ${reitinLyhytNimi}, ${reitinPitkaNimi}, Lähtö: ${muotoiltuAikataulunSaapuminen}`;
                    this.tulostaViesti(viesti, wrapper);
                } else if (aikataulu.length && pysakinJaerjestys === aikataulu[aikataulu.length - 1].stopSequence) {
                    const viesti = `${pysakinNimi}, ${reitinLyhytNimi}, ${reitinPitkaNimi}, Arvioitu saapuminen: ${muotoiltuAikataulunSaapuminen}`;
                    this.tulostaViesti(viesti, wrapper);
                } else if (reitinLyhytNimi === "1") {
                    const viesti = `${pysakinNimi}LINJA, Arvioitu saapuminen: ${muotoiltuAikataulunSaapuminen}`;
                    this.tulostaViesti(viesti, wrapper);
                } else {
                    const viesti = `${pysakinNimi}, ${reitinLyhytNimi}, ${reitinPitkaNimi}, Arvioitu saapuminen: ${muotoiltuAikataulunSaapuminen}`;
                    this.tulostaViesti(viesti, wrapper);
                }

                edellinenPysakki = aikataulu;
            } else {
                console.log(`Virhe: Aikataulu meni jo ohi`);
            }
        }
    },
	    getStyles: function () {
        return [
            'styles.css', 
        ];
    },

    muotoileAika: function (sekunnit) {
        const tunnit = Math.floor(sekunnit / 3600);
        const jaannos = sekunnit % 3600;
        const minuutit = Math.floor(jaannos / 60);
        const sekunnitJaljella = jaannos % 60;
        return `${tunnit.toString().padStart(2, '0')}:${minuutit.toString().padStart(2, '0')}:${sekunnitJaljella.toString().padStart(2, '0')}`;
    },

    haeLaehimmaetPysaekit: async function () {
        // Tämä funktio hakee lähimmät pysäkit käyttäen GraphQL-pyyntöä
        const url = 'https://api.digitransit.fi/routing/v1/routers/finland/index/graphql';

        const headers = {
            'Content-Type': 'application/json',
            'Digitransit-Subscription-Key': '',
        };

        const query = `
            {
                nearest(lat: 61.4776747, lon: 21.7890566, maxDistance: 500, filterByPlaceTypes: STOP) {
                    edges {
                        node {
                            place {
                                ...on Stop {
                                    name
                                    stoptimesWithoutPatterns {
                                        scheduledArrival
                                        realtimeArrival
                                        departureDelay
                                        serviceDay
                                        trip {
                                            route {
                                                shortName
                                                longName
                                            }
                                        }
                                        stopSequence
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const data = { query };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            const pysakit = result.data.nearest.edges;
            return pysakit;
        } catch (error) {
            console.error('Virhe:', error.message);
            return null;
        }
    },

    tulostaViesti: function (viesti, wrapper) {
        // Tämä funktio lisää viestin Magic Mirrorin näytölle
        const viestiElementti = document.createElement('div');
        viestiElementti.innerHTML = viesti;
        wrapper.appendChild(viestiElementti);
    }
});
