import {
  E2E_FOUNDER,
  applyE2eBackendEnvironment,
} from '../../e2e/support/environment.js';

applyE2eBackendEnvironment();

/**
 * Prépare un état déterministe avant le démarrage des serveurs Playwright.
 * Les imports backend sont dynamiques : `env.js` ne doit être évalué qu'après
 * l'application de la configuration E2E et de sa garde MongoDB.
 */
async function prepareE2eEnvironment() {
  const { default: mongoose } = await import('mongoose');
  const { connectDB } = await import('../../backend/config/db.js');
  const { seedPlans } = await import('../../backend/seeds/seedPlans.js');
  const { seedPlatformRoles } = await import(
    '../../backend/seeds/seedPlatformRoles.js'
  );
  const { seedSuperAdmin } = await import(
    '../../backend/seeds/seedSuperAdmin.js'
  );
  const {
    resolveM002GovernanceFounderId,
    seedM002ProductGovernance,
  } = await import(
    '../../backend/seeds/seedM002ProductGovernance.js'
  );

  await connectDB(process.env.MONGODB_URI);

  try {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) =>
        collection.deleteMany({}),
      ),
    );

    await seedPlans();
    await seedPlatformRoles();
    await seedSuperAdmin(E2E_FOUNDER);

    const founderId = await resolveM002GovernanceFounderId();
    await seedM002ProductGovernance({
      userId: founderId,
    });
  } finally {
    await mongoose.disconnect();
  }
}

prepareE2eEnvironment().catch((error) => {
  console.error('Échec de la préparation E2E :', {
    message: error.message,
  });
  process.exitCode = 1;
});
