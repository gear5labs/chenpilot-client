import { useState, useCallback } from 'react';
import { DeploymentProgress, DeploymentStep, DeploymentStepInfo, DeploymentStepStatus } from '@/types';
import { DEPLOYMENT_STEPS, DEPLOYMENT_STATUS } from '@/constants';

const INITIAL_STEPS: DeploymentStepInfo[] = [
  {
    id: 'auth',
    title: DEPLOYMENT_STEPS.AUTH.title,
    description: DEPLOYMENT_STEPS.AUTH.description,
    status: 'pending',
  },
  {
    id: 'funding',
    title: DEPLOYMENT_STEPS.FUNDING.title,
    description: DEPLOYMENT_STEPS.FUNDING.description,
    status: 'pending',
  },
  {
    id: 'deployment',
    title: DEPLOYMENT_STEPS.DEPLOYMENT.title,
    description: DEPLOYMENT_STEPS.DEPLOYMENT.description,
    status: 'pending',
  },
  {
    id: 'verification',
    title: DEPLOYMENT_STEPS.VERIFICATION.title,
    description: DEPLOYMENT_STEPS.VERIFICATION.description,
    status: 'pending',
  },
  {
    id: 'complete',
    title: DEPLOYMENT_STEPS.COMPLETE.title,
    description: DEPLOYMENT_STEPS.COMPLETE.description,
    status: 'pending',
  },
];

export const useDeploymentProgress = () => {
  const [progress, setProgress] = useState<DeploymentProgress>({
    currentStep: 'auth',
    steps: INITIAL_STEPS,
    isComplete: false,
    hasError: false,
    startTime: new Date().toISOString(),
  });

  const updateStep = useCallback((
    stepId: DeploymentStep,
    status: DeploymentStepStatus,
    metadata?: {
      timestamp?: string;
      transactionHash?: string;
      error?: string;
    }
  ) => {
    setProgress((prev) => {
      const updatedSteps = prev.steps.map((step) => {
        if (step.id === stepId) {
          return {
            ...step,
            status,
            ...metadata,
          };
        }
        return step;
      });

      const hasError = status === 'failed';
      const isComplete = stepId === 'complete' && status === 'completed';
      
      return {
        ...prev,
        steps: updatedSteps,
        currentStep: stepId,
        hasError: hasError || prev.hasError,
        isComplete: isComplete,
        endTime: isComplete ? new Date().toISOString() : prev.endTime,
      };
    });
  }, []);

  const moveToNextStep = useCallback(() => {
    setProgress((prev) => {
      const currentIndex = prev.steps.findIndex((step) => step.id === prev.currentStep);
      const nextIndex = currentIndex + 1;
      
      if (nextIndex < prev.steps.length) {
        const nextStep = prev.steps[nextIndex];
        return {
          ...prev,
          currentStep: nextStep.id,
          steps: prev.steps.map((step, index) => {
            if (index === currentIndex) {
              return { ...step, status: 'completed', timestamp: new Date().toISOString() };
            }
            if (index === nextIndex) {
              return { ...step, status: 'in_progress' };
            }
            return step;
          }),
        };
      }
      
      return prev;
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      currentStep: 'auth',
      steps: INITIAL_STEPS,
      isComplete: false,
      hasError: false,
      startTime: new Date().toISOString(),
    });
  }, []);

  const startDeployment = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      steps: prev.steps.map((step, index) => ({
        ...step,
        status: index === 0 ? 'in_progress' : 'pending',
      })),
      currentStep: 'auth',
      isComplete: false,
      hasError: false,
      startTime: new Date().toISOString(),
    }));
  }, []);

  const completeDeployment = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      steps: prev.steps.map((step) => ({
        ...step,
        status: 'completed',
        timestamp: step.status === 'completed' ? step.timestamp : new Date().toISOString(),
      })),
      currentStep: 'complete',
      isComplete: true,
      hasError: false,
      endTime: new Date().toISOString(),
    }));
  }, []);

  const failDeployment = useCallback((error: string) => {
    setProgress((prev) => {
      const currentStepIndex = prev.steps.findIndex((step) => step.id === prev.currentStep);
      
      return {
        ...prev,
        steps: prev.steps.map((step, index) => {
          if (index === currentStepIndex) {
            return {
              ...step,
              status: 'failed',
              error,
              timestamp: new Date().toISOString(),
            };
          }
          return step;
        }),
        hasError: true,
      };
    });
  }, []);

  const getProgressPercentage = useCallback(() => {
    const completedSteps = progress.steps.filter((step) => step.status === 'completed').length;
    return Math.round((completedSteps / progress.steps.length) * 100);
  }, [progress.steps]);

  return {
    progress,
    updateStep,
    moveToNextStep,
    resetProgress,
    startDeployment,
    completeDeployment,
    failDeployment,
    getProgressPercentage,
  };
};
