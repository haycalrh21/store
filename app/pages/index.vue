<script setup lang="ts">
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active')
        }
      })
    },
    { threshold: 0.1 }
  )

  const observeElements = () => {
    document.querySelectorAll('.reveal:not(.active)').forEach((el) => observer.observe(el))
  }

  observeElements()

  const mutation = new MutationObserver(() => observeElements())
  mutation.observe(document.body, { childList: true, subtree: true })

  onBeforeUnmount(() => {
    observer.disconnect()
    mutation.disconnect()
  })
})
</script>

<template>
  <div>
    <SectionHero />
    <ProductSection />
  </div>
</template>