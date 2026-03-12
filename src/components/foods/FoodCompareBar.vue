<template>
  <div class="compare-bar container">
    <span class="compare-bar-text">已選 {{ count }} / 5 項</span>
    <button
      class="btn btn-primary"
      :disabled="count < 2"
      @click="$emit('compare')"
    >
      開始比較
    </button>
  </div>
</template>

<script setup>
defineProps({ count: Number })
defineEmits(['compare'])
</script>
