Module.register("MMM-Samk-Ruokala", {
  defaults: {
    jsonFile: "all_menus.json",
    updateInterval: 60000,
    displayTime: 5000,
  },
  getStyles: function () {
    return ["MMM-Samk-Ruokala.css"];
  },
  start: function () {
    Log.info("Starting module: " + this.name);
    this.loaded = false;
    this.menuData = [];
    this.currentRestaurantIndex = 0;
    this.currentMenuItemIndex = 0;
    this.updateMenuData();
    this.scheduleUpdate();
  },

  showNextMenuItem: function () {
    const self = this;
    const data = self.menuData[self.currentRestaurantIndex];

    if (data && Object.keys(data).length > 0) {
      const restaurantName = Object.keys(data)[0];
      const dayMenus = data[restaurantName];

      if (dayMenus) {
        const setMenus = dayMenus[0].SetMenus || [];

        if (setMenus.length > 0) {
          const setMenu = setMenus[self.currentMenuItemIndex];
          self.currentMenuItemIndex = (self.currentMenuItemIndex + 1) % setMenus.length;
          self.updateDom();

          setTimeout(() => {
            self.showNextMenuItem();
          }, 5000);
        } else {
          self.currentMenuItemIndex = 0;
          self.currentRestaurantIndex = (self.currentRestaurantIndex + 1) % self.menuData.length;
        }
      }
    } else {
      console.error("Ravintolatietoja ei löytynyt tai tarpeeksi vähän ravintoloita.");
    }
  },

  getDom: function () {
    const wrapper = document.createElement("div");

    if (!this.loaded) {
      wrapper.innerHTML = "Ladataan...";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    const menuWrapper = document.createElement("div");
    const data = this.menuData[this.currentRestaurantIndex];

    if (data && Object.keys(data).length > 0) {
      const restaurantName = Object.keys(data)[0];
      const dayMenus = data[restaurantName];

      if (dayMenus) {
        const restaurantElement = document.createElement("div");
        restaurantElement.innerHTML = "<strong>Ravintolan nimi:</strong> " + restaurantName;
        menuWrapper.appendChild(restaurantElement);

        const setMenus = dayMenus[0].SetMenus || [];

        if (setMenus.length > 0) {
          const setMenu = setMenus[this.currentMenuItemIndex];
          this.renderMenu(setMenu, menuWrapper);
        } else {
          Log.error(this.name + ": Virheellinen tiedoston rakenne.");
        }
      }

      wrapper.appendChild(menuWrapper);
      return wrapper;
    }
  },

  renderMenu: function (setMenu, menuWrapper) {
    const menuElement = document.createElement("div");
    const menu_name = setMenu.Name || "Ei saatavilla";
    const menu_price = setMenu.Price || "Ei saatavilla";

    if (menu_price === null) {
      menu_price = "";
    }

    if (menu_name === null) {
      menu_name = "Ei saatavilla";
    }

    menuElement.innerHTML =
      "<strong>Ruokalaji:</strong> " + menu_name + "<br>" +
      "<strong>Hinta:</strong> " + menu_price;

    const components = setMenu.Components || [];
    const componentsList = document.createElement("ul");

    components.forEach((component) => {
      const componentItem = document.createElement("li");
      componentItem.textContent = component;
      componentsList.appendChild(componentItem);
    });

    menuElement.appendChild(componentsList);
    menuWrapper.appendChild(menuElement);
  },

  scheduleUpdate: function () {
    const self = this;

    setInterval(() => {
      self.updateMenuData();
    }, self.config.updateInterval);

    setTimeout(() => {
      self.showNextMenuItem();
    }, self.config.displayTime);
  },

  updateMenuData: function () {
    const self = this;

    this.getJson("modules/MMM-Samk-Ruokala/" + this.config.jsonFile, (data) => {
      if (data) {
        self.menuData = [data];
        self.loaded = true;
        self.currentMenuItemIndex = 0;
        self.updateDom();
      } else {
        Log.error(self.name + ": Virhe luettaessa tiedostoa.");
      }
    });
  },

  getJson: function (file, callback) {
    const jsonRequest = new XMLHttpRequest();
    jsonRequest.overrideMimeType("application/json");
    jsonRequest.open("GET", file, true);

    jsonRequest.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        const data = JSON.parse(this.responseText);
        callback(data);
      }
    };

    jsonRequest.send();
  },
});
