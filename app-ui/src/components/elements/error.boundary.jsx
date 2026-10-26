import { Component } from 'react';

/**
 * Catches an error while a part of the page is drawn, so that one broken
 * part does not leave the whole page blank: fallback(error, retry) is shown
 * in its place. The error goes to the console of the browser.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
        this.retry = () => this.setState({ error: null });
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error(error, info?.componentStack);
    }

    render() {
        if (this.state.error) return this.props.fallback(this.state.error, this.retry);
        return this.props.children;
    }
}

export default ErrorBoundary;
