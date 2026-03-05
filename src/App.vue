<template>
  <RouterView />
  <ConfirmModal />
  <InputModal />
  <Toast />
</template>

<script setup>
import ConfirmModal from './components/modals/ConfirmModal.vue'
import InputModal   from './components/modals/InputModal.vue'
import Toast        from './components/modals/Toast.vue'
</script>
