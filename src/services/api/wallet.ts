import axios from 'axios';
import { ApiClient, apiClient, PaymentRequestConfig } from './client';
import {
  SendPaymentRequest,
  BalanceResponse,
  ApiResponse,
  StellarTransaction,
  PaymentSubmissionResult,
  PaymentStatusResult,
} from '@/types';
import { horizonFetch } from '@/utils/horizonFetch';
import { buildPaymentIdempotencyKey } from '@/utils/paymentIdempotency';
import {
  PaymentOutcomeUnknownError,
  isPaymentOutcomeUnknown,
} from '@/utils/paymentOutcome';
import { logger } from '../../utils/logger';

export interface Trustline {
  assetCode: string;
  assetIssuer: string;
  balance: string;
  limit: string;
  assetType?: string;
  buyingLiabilities?: string;
  sellingLiabilities?: string;
}

export interface AddTrustlineRequest {
  assetCode: string;
  assetIssuer: string;
  limit?: string;
}

export interface FundingResult {
  success: boolean;
  message: string;
  txHash?: string;
}

const FRIENDTEST_URL = 'https://friendbot.stellar.org';

const isAxiosLike = (error: unknown): error is { response?: { status?: number } } =>
  axios.isAxiosError(error) || (typeof error === 'object' && error !== null && 'response' in error);

export const requestAccountFunding = async (
  publicKey: string,
  requiredAmount: number,
  currentBalance: number,
  isTestnet: boolean,
): Promise<FundingResult> => {
  if (currentBalance >= requiredAmount) {
    return {
      success: true,
      message: `Account is already sufficiently funded (${currentBalance} XLM >= required ${requiredAmount} XLM).`,
    };
  }

  try {
    const response = await axios.post('/api/fund', {
      publicKey,
      requiredAmount,
    });

    return {
      success: true,
      message: 'Account funded successfully via backend service.',
      txHash: response.data.txHash,
    };
  } catch (backendError: unknown) {
    if (isTestnet) {
      try {
        const friendbotResponse = await axios.get(
          `${FRIENDTEST_URL}/?addr=${encodeURIComponent(publicKey)}`,
        );

        return {
          success: true,
          message:
            'Account funded successfully via Stellar Testnet Friendbot fallback.',
          txHash: friendbotResponse.data.hash,
        };
      } catch {
        throw new Error(
          `Funding failed: Backend service unavailable and Friendbot fallback failed. Required: ${requiredAmount} XLM, Current: ${currentBalance} XLM.`,
        );
      }
    }

    const statusCode = isAxiosLike(backendError)
      ? backendError.response?.status
      : undefined;

    if (statusCode === 429) {
      throw new Error(
        `Funding rate limit exceeded. Required: ${requiredAmount} XLM. Please try again later.`,
      );
    }

    if (statusCode === 400) {
      throw new Error(
        `Invalid funding request. Required balance: ${requiredAmount} XLM, Current: ${currentBalance} XLM.`,
      );
    }

    throw new Error(
      `Failed to fund account. Required: ${requiredAmount} XLM, Current: ${currentBalance} XLM. Please check your network connection.`,
    );
  }
};

export class WalletApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  async deployAccount(): Promise<
    ApiResponse<{
      transactionHash: string;
      contractAddress: string;
    }>
  > {
    const response = await this.client.api.post<
      ApiResponse<{
        transactionHash: string;
        contractAddress: string;
      }>
    >('/auth/starknet/deploy');

    return response.data;
  }

  async getBalance(): Promise<BalanceResponse> {
    const response = await this.client.api.get<BalanceResponse>(
      '/auth/starknet/balance',
    );

    return response.data;
  }

  async getAccountStatus(): Promise<
    ApiResponse<{
      isDeployed: boolean;
      isFunded: boolean;
      address: string;
      publicKey: string;
    }>
  > {
    const response = await this.client.api.get<
      ApiResponse<{
        isDeployed: boolean;
        isFunded: boolean;
        address: string;
        publicKey: string;
      }>
    >('/auth/starknet/status');

    return response.data;
  }

  async fundAccount(): Promise<
    ApiResponse<{ transactionHash: string; amount: string }>
  > {
    const response = await this.client.api.post<
      ApiResponse<{ transactionHash: string; amount: string }>
    >('/auth/funding/fund-account');

    return response.data;
  }

  async getAutoFundingStats(): Promise<
    ApiResponse<{
      totalFunded: number;
      totalAccounts: number;
      averageAmount: string;
    }>
  > {
    const response = await this.client.api.get<
      ApiResponse<{
        totalFunded: number;
        totalAccounts: number;
        averageAmount: string;
      }>
    >('/auth/funding/auto-funding-stats');

    return response.data;
  }

  async getFundedAccountBalance(): Promise<
    ApiResponse<{ balance: string; hasBalance: boolean }>
  > {
    const response = await this.client.api.get<
      ApiResponse<{ balance: string; hasBalance: boolean }>
    >('/auth/funding/funded-account-balance');

    return response.data;
  }

  async batchFund(
    amounts: string[],
  ): Promise<
    ApiResponse<{
      transactionHashes: string[];
      totalAmount: string;
    }>
  > {
    const response = await this.client.api.post<
      ApiResponse<{
        transactionHashes: string[];
        totalAmount: string;
      }>
    >('/auth/funding/batch-fund', { amounts });

    return response.data;
  }

  async getAccountTransactions(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<
    ApiResponse<{
      transactions: StellarTransaction[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    try {
      const response = await this.client.api.get<
        ApiResponse<{
          transactions: StellarTransaction[];
          total: number;
          page: number;
          limit: number;
        }>
      >(
        `/account/${encodeURIComponent(userId)}/transactions`,
        { params: { page, limit } },
      );

      return response.data;
    } catch (error: unknown) {
      if (!isAxiosLike(error) || error.response?.status !== 404) {
        throw error;
      }

      // Alternative route fallback
      try {
        const fallbackResponse = await this.client.api.get<
          ApiResponse<{
            transactions: StellarTransaction[];
            total: number;
            page: number;
            limit: number;
          }>
        >('/account/transactions', {
          params: { userId, page, limit },
        });

        return fallbackResponse.data;
      } catch {
        throw error;
      }
    }
  }

  async sendPayment(
    payment: SendPaymentRequest,
    idempotencyKey: string,
  ): Promise<PaymentSubmissionResult>;

  async sendPayment(
    payment: SendPaymentRequest,
  ): Promise<ApiResponse<{ paymentId: string; status: string }>>;

  async sendPayment(
    payment: SendPaymentRequest,
    suppliedIdempotencyKey?: string,
  ): Promise<
    | PaymentSubmissionResult
    | ApiResponse<{ paymentId: string; status: string }>
  > {
    const paymentWithKey = payment as SendPaymentRequest & {
      idempotencyKey?: string;
    };

    const idempotencyKey =
      suppliedIdempotencyKey ||
      paymentWithKey.idempotencyKey ||
      buildPaymentIdempotencyKey(payment);

    try {
      const response = await this.client.api.post<
        | PaymentSubmissionResult
        | ApiResponse<{ paymentId: string; status: string }>
        | ApiResponse<PaymentSubmissionResult>
      >(
        '/payments',
        {
          ...payment,
          idempotencyKey,
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
          paymentOperation: true,
        } as PaymentRequestConfig,
      );

      const payload = response.data;

      if (!suppliedIdempotencyKey) {
        return payload as ApiResponse<{
          paymentId: string;
          status: string;
        }>;
      }

      if ('success' in payload) {
        if (!payload.success) {
          throw new Error(
            payload.message || 'Payment submission failed.',
          );
        }

        return payload.data as PaymentSubmissionResult;
      }

      return payload as PaymentSubmissionResult;
    } catch (error: unknown) {
      if (isPaymentOutcomeUnknown(error)) {
        throw new PaymentOutcomeUnknownError(
          'We could not confirm whether the payment was submitted. Check its status before taking any further action.',
        );
      }

      throw error;
    }
  }

  async getPaymentStatus(
    idempotencyKey: string,
  ): Promise<PaymentStatusResult> {
    const response = await this.client.api.get<
      PaymentStatusResult | ApiResponse<PaymentStatusResult>
    >('/payments/status', {
      params: { idempotencyKey },
    });

    const payload = response.data;

    if ('success' in payload) {
      if (!payload.success) {
        throw new Error(
          payload.message || 'Payment status is unavailable.',
        );
      }

      return payload.data;
    }

    return payload;
  }

  async fetchAccountTrustlines(
    publicKey: string,
  ): Promise<Trustline[]> {
    try {
      const response = await this.client.api.get<
        ApiResponse<Trustline[]> | Trustline[]
      >(`/account/${encodeURIComponent(publicKey)}/trustlines`);

      if (Array.isArray(response.data)) {
        return response.data;
      }

      if (
        response.data &&
        'data' in response.data &&
        Array.isArray(response.data.data)
      ) {
        return response.data.data;
      }
    } catch {
      try {
        const response = await horizonFetch(
          `/accounts/${encodeURIComponent(publicKey)}`,
        );

        if (response.ok) {
          const accountData = await response.json();
          const balances = Array.isArray(accountData.balances)
            ? accountData.balances
            : [];

          return balances
            .filter(
              (balance: { asset_type?: string }) =>
                balance.asset_type !== 'native',
            )
            .map(
              (balance: {
                asset_code?: string;
                asset_issuer?: string;
                balance?: string;
                limit?: string;
                asset_type?: string;
                buying_liabilities?: string;
                selling_liabilities?: string;
              }) => ({
                assetCode: balance.asset_code || '',
                assetIssuer: balance.asset_issuer || '',
                balance: balance.balance || '0',
                limit: balance.limit || '0',
                assetType: balance.asset_type,
                buyingLiabilities: balance.buying_liabilities,
                sellingLiabilities: balance.selling_liabilities,
              }),
            );
        }
      } catch (fallbackError) {
        logger.warn(
          'Horizon fallback for trustlines failed',
          fallbackError,
        );
      }
    }

    return [];
  }

  async addTrustline(
    publicKey: string,
    data: AddTrustlineRequest,
  ): Promise<ApiResponse<Trustline> | unknown> {
    const response = await this.client.api.post<
      ApiResponse<Trustline> | Trustline
    >(
      `/account/${encodeURIComponent(publicKey)}/trustlines`,
      data,
    );

    return response.data;
  }

  async removeTrustline(
    publicKey: string,
    assetCode: string,
    assetIssuer: string,
  ): Promise<ApiResponse<void> | unknown> {
    const response = await this.client.api.delete<ApiResponse<void>>(
      `/account/${encodeURIComponent(publicKey)}/trustlines`,
      {
        data: { assetCode, assetIssuer },
      },
    );

    return response.data;
  }
}

export const walletApi = new WalletApi();
