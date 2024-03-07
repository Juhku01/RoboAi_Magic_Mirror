Module.register("MMM-Liikennetiedotteet", {
    // Default module config.
    defaults: {
        updateInterval: 20000, // päivitysväli millisekunteina, tässä 10000ms (10 sekuntia)
        rotationInterval: 30000, // tekstien vaihtoväli millisekunteina, tässä 30000ms (30 sekuntia)
    },
	getStyles: function () {
        return ["MMM-Liikennetiedotteet.css"]; // Add a separate CSS file for styling
    },
    start: function () {
        // Aseta päivitysajastin
        var self = this;
        setInterval(function () {
            self.fetchTrafficData(); // Siirretty päivitysfunktio tähän
        }, this.config.updateInterval);

        // Alusta tiedotteen indeksi
        this.currentIndex = 0;

        // Alusta ensimmäinen päivitysaika
        this.lastUpdateTime = 0;
    },

    // Override dom generator.
    getDom: function () {
        // Luodaan wrapper-div
        var wrapper = document.createElement("div");
        wrapper.id = "trafficInfo"; // Lisää id elementille

        // Kutsu funktiota, joka sisältää liikennetiedotteiden tiedot
        this.fetchTrafficData();

        return wrapper;
    },

    // Lisää uusi funktio moduulille, joka hakee liikennetiedot
    fetchTrafficData: function () {
        // Estä pyyntöjen tekeminen liian tiheään
        const currentTime = new Date().getTime();
        if (currentTime - this.lastUpdateTime < this.config.rotationInterval) {
            return;
        }

        // Päivitä viimeisin päivitysaika
        this.lastUpdateTime = currentTime;

        // URL, josta tiedot haetaan
        const apiUrl = "https://tie.digitraffic.fi/api/traffic-message/v1/messages?inactiveHours=0&includeAreaGeometry=false&situationType=TRAFFIC_ANNOUNCEMENT";

        // Suorita HTTP-pyyntö
        fetch(apiUrl)
            .then(response => response.json()) // Muunna vastaus JSON-muotoon
            .then(data => {
                // Luodaan tyhjä taulukko, johon tallennetaan käsitellyt tiedot
                let processedData = [];

                // Käydään läpi jokainen liikennetiedote
                data.features.forEach(feature => {
                    // Tarkista, että liikennetiedotteessa on ilmoituksia
                    if (feature.properties.announcements && feature.properties.announcements.length > 0) {
                        // Otsikko (title)
                        const title = feature.properties.announcements[0].title;

                        if (title) {
                            // Kuvaus (description)
                            const description = feature.properties.announcements[0].location.description || 'Ei saatavilla';

                            // Aloitusaika ja päättymisaika
                            const startTime = feature.properties.announcements[0].timeAndDuration && feature.properties.announcements[0].timeAndDuration.startTime
                                ? this.formatDateTime(feature.properties.announcements[0].timeAndDuration.startTime)
                                : 'Aloitusaika ei saatavilla';

                            const endTime = feature.properties.announcements[0].timeAndDuration && feature.properties.announcements[0].timeAndDuration.endTime
                                ? this.formatDateTime(feature.properties.announcements[0].timeAndDuration.endTime)
                                : 'Päättymisaika ei saatavilla';

                            // Kommentti
                            const comment = feature.properties.announcements[0].comment || 'Ei saatavilla';

                            // Yhdistä aloitus- ja päättymispäivämäärät yhteen riviin
                            const dateTimeRange = `${startTime} - ${endTime}`;

                            // Luodaan objekti, joka sisältää halutut tiedot
                            const processedItem = {
                                title: title,
                                description: description,
                                dateTimeRange: dateTimeRange,
                                comment: comment,
                            };

                            // Lisätään objekti taulukkoon
                            processedData.push(processedItem);
                        }
                    }
                });

                // Luo HTML-elementit tiedoille ja lisää ne sivulle
                const trafficInfoDiv = document.getElementById('trafficInfo');

                // Tyhjennä elementti ennen uusien tietojen lisäämistä
                trafficInfoDiv.innerHTML = "";

                // Näytä yksi liikennetiedote kerrallaan animoidusti
                const additionalText = document.createElement('div');
                additionalText.innerHTML = '<em>Palvelun tarjoaa Fintraffic</em><br>';
                trafficInfoDiv.appendChild(additionalText);

                const currentIndexItem = processedData[this.currentIndex];
                if (currentIndexItem) {
                    const infoElement = document.createElement('div');
                    infoElement.innerHTML = `<strong>${currentIndexItem.title}</strong><br>
                                         Tietoja: ${currentIndexItem.description}<br>
                                         Aikaväli: ${currentIndexItem.dateTimeRange} <br>
                                         Lisätietoja: ${currentIndexItem.comment} <br><br>`;
                    trafficInfoDiv.appendChild(infoElement);
                }

                // Aseta aikaväli seuraavaa päivitystä varten
                setTimeout(() => {
                    this.fetchTrafficData();
                }, this.config.rotationInterval);

                // Päivitä indeksi seuraavaa liikennetiedotetta varten
                this.currentIndex = (this.currentIndex + 1) % processedData.length;
            })
            .catch(error => {
                console.error('Virhe pyynnössä:', error);
            });
    },

    // Funktio muotoilun muuttamiseksi
    formatDateTime: function (dateTimeString) {
        const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        return new Date(dateTimeString).toLocaleString('fi-FI', options);
    },
});
