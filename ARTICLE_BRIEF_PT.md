# Briefing para a Eva

Escreva um artigo curto, entre 400 e 600 palavras, apresentando a extensão **ComfyUI Find Words**. Use um tom claro, prático e moderado, sem exageros publicitários.

O artigo deve:

1. Explicar o problema: workflows grandes do ComfyUI tornam difícil localizar palavras em prompts, títulos, widgets e propriedades dos nodes.
2. Apresentar a solução: um campo de busca integrado à barra superior, acessível por clique ou pelo atalho `Ctrl+F`.
3. Mencionar os principais recursos:
   - resultados agrupados por node;
   - contagem e navegação por todas as ocorrências com `Enter` e `Shift+Enter`;
   - filtros por texto/widgets, títulos/tipos e propriedades;
   - opções de diferenciar maiúsculas e minúsculas e pesquisar palavra inteira;
   - centralização automática do node encontrado;
   - seleção exata do termo e destaque amarelo oscilante para chamar atenção;
   - botão para limpar a busca e atualização rápida dos resultados.
4. Incluir uma seção curta de instalação com:

   ```bash
   cd ComfyUI/custom_nodes
   git clone https://github.com/v74199506-cyber/comfyui-find-words.git
   ```

   Depois, orientar o leitor a reiniciar o ComfyUI e recarregar a página.
5. Explicar em poucas linhas como usar: clicar no campo **Find words...** ou pressionar `Ctrl+F`, digitar o termo e usar `Enter`/`Shift+Enter` para navegar.
6. Informar que a extensão funciona somente no frontend e não instala dependências Python adicionais.
7. Encerrar convidando o leitor a testar, relatar problemas e sugerir melhorias no repositório:
   https://github.com/v74199506-cyber/comfyui-find-words

Sugestão de título: **ComfyUI Find Words: encontre qualquer termo no seu workflow com Ctrl+F**

Não invente números de usuários, desempenho, compatibilidade ou avaliações. Evite chamar a extensão de “revolucionária”, “indispensável” ou usar linguagem grandiosa.
