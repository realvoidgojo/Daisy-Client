try {
        var s = window.localStorage.getItem("daisy:bootSeason");
        if (s) document.documentElement.dataset.season = s;
        /* The launcher is always drawn in the Modern layout, and so is the splash. */
        document.documentElement.dataset.bootUi = "modern";
      } catch (e) {}
    
/* Written here, not rendered by React, so the row is on the first frame with the rest. */
      (function () {
        var row = document.getElementById("boot-blocks");
        for (var i = 0; i < 20; i++) {
          var block = document.createElement("i");
          block.style.animationDelay = (i * 55) + "ms";
          row.appendChild(block);
        }
      })();
    
