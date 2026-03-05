<template>
  <Teleport to="body">
    <div v-if="modal.confirm.visible" class="overlay" style="z-index:150" @click.self="resolve(false)">
      <div class="modal">
        <div class="modal-body" style="text-align:center">
          <p style="margin-bottom:var(--gap-md);font-size:14px">{{ modal.confirm.message }}</p>
          <div style="display:flex;gap:var(--gap-sm)">
            <button class="btn btn-outline" style="flex:1" @click="resolve(false)">取消</button>
            <button class="btn btn-primary" style="flex:1" @click="resolve(true)">確定</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { store } from '../../store/index.js'

const modal = store.modal

function resolve(value) {
  modal.confirm.resolve?.(value)
  modal.confirm.visible = false
}
</script>
