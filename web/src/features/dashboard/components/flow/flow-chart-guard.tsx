import { Component, type ReactNode } from 'react'

type FlowChartGuardProps = {
  fallback: ReactNode
  children: ReactNode
}

type FlowChartGuardState = {
  failed: boolean
}

export class FlowChartGuard extends Component<
  FlowChartGuardProps,
  FlowChartGuardState
> {
  state: FlowChartGuardState = { failed: false }

  static getDerivedStateFromError(): FlowChartGuardState {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback
    }
    return this.props.children
  }
}
