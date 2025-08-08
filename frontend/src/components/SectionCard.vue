<template>
  <el-card class="section-card" :shadow="shadow">
    <template v-if="hasHeader" #header>
      <div class="card-header">
        <div class="left">
          <slot name="icon" />
          <div class="titles">
            <div class="title">{{ title }}</div>
            <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
          </div>
        </div>
        <div class="right">
          <slot name="actions" />
        </div>
      </div>
    </template>
    <slot />
  </el-card>
</template>

<script>
export default {
  name: 'SectionCard',
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    shadow: { type: String, default: 'always' }
  },
  computed: {
    hasHeader() {
      return this.title || this.$slots.icon || this.$slots.actions
    }
  }
}
</script>

<style lang="scss" scoped>
.section-card {
  :deep(.el-card__header) {
    padding: 16px 20px;
    background: var(--app-soft-bg);
    border-bottom: 1px solid var(--app-border-color);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .left {
      display: flex;
      align-items: center;
      gap: 10px;
      .titles {
        .title { font-weight: 700; color: var(--app-text-color); }
        .subtitle { font-size: 12px; color: var(--app-text-secondary); margin-top: 2px; }
      }
    }
    .right { display: inline-flex; align-items: center; gap: 8px; }
  }
}
</style>


