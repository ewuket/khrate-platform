import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, PaymentMethodKey } from './payment-provider.interface';
import { ManualMomoProvider } from './providers/manual-momo.provider';

/**
 * Selects the active payment provider by configuration. Register new providers here;
 * business code asks the registry for "the active provider" and never names one directly.
 */
@Injectable()
export class PaymentRegistry {
  private readonly providers = new Map<PaymentMethodKey, PaymentProvider>();

  constructor(
    private readonly config: ConfigService,
    manualMomo: ManualMomoProvider,
    // Future: inject MtnMomoApiProvider, AirtelMoneyProvider, ... and register below.
  ) {
    this.register(manualMomo);
  }

  register(provider: PaymentProvider): void {
    this.providers.set(provider.key, provider);
  }

  get(key: PaymentMethodKey): PaymentProvider {
    const provider = this.providers.get(key);
    if (!provider) throw new Error(`No payment provider registered for ${key}`);
    return provider;
  }

  /** The provider chosen for new charges. Config-driven; defaults to launch MoMo-manual. */
  active(): PaymentProvider {
    const key = (this.config.get<string>('PAYMENT_PROVIDER') ?? 'MOMO_MANUAL') as PaymentMethodKey;
    return this.get(key);
  }
}
