<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Home" :ui="{ toggle: 'hidden' }" />
    </template>

    <template #body>
      <HomeBudgetPlanner />
    </template>
  </UDashboardPanel>
</template>
