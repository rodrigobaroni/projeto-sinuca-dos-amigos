import React from "react";

// Sem isto, qualquer excecao durante a renderizacao desmonta a arvore inteira e
// o usuario fica com uma tela branca sem explicacao nem saida.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Erro na renderização:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app">
        <div className="empty">
          Alguma coisa quebrou aqui.
          <br />
          <small style={{ color: "var(--clay)" }}>{this.state.error.message}</small>
          <br />
          <button className="btn chalk" onClick={() => window.location.reload()}>Recarregar</button>
        </div>
      </div>
    );
  }
}
