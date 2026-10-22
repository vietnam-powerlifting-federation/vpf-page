<template>
  <!-- Three white judging lights: a good lift. -->
  <span class="inline-flex h-7 shrink-0 items-center gap-[5px] rounded-full bg-board-deep px-2 ring-1 ring-board-line ring-inset" aria-hidden="true">
    <i v-for="n in 3" :key="n" class="size-[9px] rounded-full bg-light shadow-light" />
  </span>
</template>
