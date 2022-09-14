<template>
  <section id="InfoPanelSection">
    <header class="sidebyside-column-top">
      <button
        class="cldr-nav-btn info-panel-closebox"
        title="Close"
        @click="closeInfoPanel"
      >
        X
      </button>
      <span class="i-am-info-panel">Info Panel</span>
    </header>
  </section>
</template>

<script>
import * as cldrInfo from "../esm/cldrInfo.js";

export default {
  methods: {
    closeInfoPanel() {
      cldrInfo.closePanel();
    },
  },
};
</script>

<style scoped>
#InfoPanelSection {
  border-top: 1px solid #cfeaf8;
  font-size: small;
}

header {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  text-align: baseline;
  align-items: center;
  margin: 0;
  padding: 1ex 0;
  background-color: white;
  background-image: linear-gradient(white, #e7f7ff);
}

.info-panel-closebox {
  margin-left: 1ex;
}

.i-am-info-panel {
  font-weight: bold;
  margin-right: 1ex;
}
</style>
