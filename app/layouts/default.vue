<template>
  <div class="flex min-h-screen flex-col">
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">Skip to content</a>
    <AnnouncementBar />
    <StoreClosedBanner />
    <SiteHeader />
    <main id="main" class="flex-1"><slot /></main>
    <SiteFooter />
    <FloatingActions />
    <CartDrawer />
    <ToastHost />
  </div>
</template>
