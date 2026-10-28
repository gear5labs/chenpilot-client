'use client';

import React from 'react';
import { DeploymentProgress, DeploymentStepInfo } from '@/types';
import {
  Shield,
  Coins,
  Rocket,
  CheckCircle,
  Sparkles,
  Loader2,
  XCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface DeploymentStepperProps {
  progress: DeploymentProgress;
  className?: string;
}

const iconMap = {
  auth: Shield,
  funding: Coins,
  deployment: Rocket,
  verification: CheckCircle,
  complete: Sparkles,
};

export const DeploymentStepper: React.FC<DeploymentStepperProps> = ({
  progress,
  className,
}) => {
  const getStepIcon = (step: DeploymentStepInfo) => {
    const IconComponent = iconMap[step.id];
    
    if (step.status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-400" />;
    }
    
    if (step.status === 'failed') {
      return <XCircle className="h-5 w-5 text-red-400" />;
    }
    
    if (step.status === 'in_progress') {
      return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
    }
    
    return <IconComponent className="h-5 w-5 text-gray-400" />;
  };

  const getStepStyles = (step: DeploymentStepInfo, index: number) => {
    const isCompleted = step.status === 'completed';
    const isCurrent = step.id === progress.currentStep;
    const isFailed = step.status === 'failed';
    const isPending = step.status === 'pending';

    const baseClasses = 'flex items-center p-4 rounded-lg border transition-all duration-300';
    
    if (isCompleted) {
      return cn(
        baseClasses,
        'border-green-500/30 bg-green-500/10'
      );
    }
    
    if (isFailed) {
      return cn(
        baseClasses,
        'border-red-500/30 bg-red-500/10'
      );
    }
    
    if (isCurrent) {
      return cn(
        baseClasses,
        'border-blue-500/30 bg-blue-500/10 ring-2 ring-blue-500/20'
      );
    }
    
    return cn(
      baseClasses,
      'border-gray-700 bg-gray-800/50'
    );
  };

  const getConnectorLine = (index: number, totalSteps: number) => {
    if (index >= totalSteps - 1) return null;
    
    const nextStep = progress.steps[index + 1];
    const isCompleted = nextStep.status === 'completed' || nextStep.status === 'in_progress';
    
    return (
      <div
        className={cn(
          'w-12 h-0.5 transition-all duration-500',
          isCompleted ? 'bg-green-500' : 'bg-gray-700'
        )}
      />
    );
  };

  const getStepNumber = (step: DeploymentStepInfo, index: number) => {
    if (step.status === 'completed') {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-semibold">
          <CheckCircle className="h-4 w-4" />
        </div>
      );
    }
    
    if (step.status === 'failed') {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white font-semibold">
          <XCircle className="h-4 w-4" />
        </div>
      );
    }
    
    if (step.status === 'in_progress') {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-semibold">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-gray-400 font-semibold">
        {index + 1}
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Account Deployment Progress
        </h3>
        <p className="text-sm text-gray-400">
          {progress.isComplete
            ? 'Your account has been successfully deployed!'
            : progress.hasError
            ? 'Deployment encountered an error'
            : 'Your account is being deployed...'}
        </p>
      </div>

      <div className="space-y-0">
        {progress.steps.map((step, index) => (
          <div key={step.id} className="flex items-start">
            <div className="flex items-center">
              {getStepNumber(step, index)}
              {getConnectorLine(index, progress.steps.length)}
            </div>
            
            <div className={cn('flex-1 ml-4', index < progress.steps.length - 1 ? 'mb-4' : '')}>
              <div className={getStepStyles(step, index)}>
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {getStepIcon(step)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">
                        {step.title}
                      </h4>
                      {step.timestamp && (
                        <span className="text-xs text-gray-500">
                          {new Date(step.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {step.description}
                    </p>
                    {step.error && (
                      <p className="text-sm text-red-400 mt-2">
                        {step.error}
                      </p>
                    )}
                    {step.transactionHash && (
                      <div className="mt-2">
                        <code className="text-xs bg-gray-900 px-2 py-1 rounded text-gray-400">
                          TX: {step.transactionHash.slice(0, 8)}...{step.transactionHash.slice(-8)}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {progress.isComplete && (
        <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-green-400 font-medium">
              Deployment Complete
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Your account is now ready for use. You can start using DeFi protocols.
          </p>
        </div>
      )}

      {progress.hasError && !progress.isComplete && (
        <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-400 font-medium">
              Deployment Failed
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Please check the error details above and try again.
          </p>
        </div>
      )}
    </div>
  );
};

export default DeploymentStepper;
