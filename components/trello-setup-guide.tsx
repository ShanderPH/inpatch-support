'use client';

import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { FiExternalLink, FiKey, FiSettings, FiCopy } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export const TrelloSetupGuide = () => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6"
      initial={{ opacity: 0, y: 20 }}
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          🔧 Configuração do Trello
        </h2>
        <p className="text-default-600">
          Configure a integração com o Trello para sincronizar seus projetos
          automaticamente
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Step 1: Get API Key */}
        <Card className="liquid-glass">
          <CardHeader className="flex gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white">
              <FiKey className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <p className="text-md font-semibold">1. Obter API Key</p>
              <p className="text-small text-default-500">
                Acesse o painel de desenvolvedor do Trello
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <ol className="space-y-2 text-sm text-default-600 mb-4">
              <li>
                1. Acesse <strong>trello.com/app-key</strong>
              </li>
              <li>
                2. Copie sua <strong>API Key</strong>
              </li>
              <li>3. Clique em "Token" para gerar um token</li>
              <li>4. Autorize o acesso à sua conta</li>
              <li>
                5. Copie o <strong>Token</strong> gerado
              </li>
            </ol>
            <Button
              className="w-full"
              color="primary"
              startContent={<FiExternalLink className="w-4 h-4" />}
              variant="flat"
              onClick={() =>
                window.open('https://trello.com/app-key', '_blank')
              }
            >
              Abrir Painel do Trello
            </Button>
          </CardBody>
        </Card>

        {/* Step 2: Configure Environment */}
        <Card className="liquid-glass">
          <CardHeader className="flex gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success-500 text-white">
              <FiSettings className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <p className="text-md font-semibold">2. Configurar Variáveis</p>
              <p className="text-small text-default-500">
                Crie o arquivo .env.local
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-default-600 mb-4">
              Crie um arquivo{' '}
              <code className="bg-default-100 px-1 rounded">.env.local</code> na
              raiz do projeto com:
            </p>
            <div className="bg-default-100 dark:bg-default-800 p-3 rounded-lg text-sm font-mono mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-default-500">
                  # Configuração do Trello
                </span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onClick={() =>
                    copyToClipboard(
                      'NEXT_PUBLIC_TRELLO_API_KEY=sua_api_key_aqui\nNEXT_PUBLIC_TRELLO_API_TOKEN=seu_token_aqui\nNEXT_PUBLIC_TRELLO_BOARD_ID=RVFcbKeF',
                      'Configuração'
                    )
                  }
                >
                  <FiCopy className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                <div>
                  NEXT_PUBLIC_TRELLO_API_KEY=
                  <span className="text-warning">sua_api_key_aqui</span>
                </div>
                <div>
                  NEXT_PUBLIC_TRELLO_API_TOKEN=
                  <span className="text-warning">seu_token_aqui</span>
                </div>
                <div>
                  NEXT_PUBLIC_TRELLO_BOARD_ID=
                  <span className="text-success">RVFcbKeF</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-default-500">
              O Board ID já foi extraído da sua URL do Trello
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Board Information */}
      <Card className="liquid-glass mt-6">
        <CardHeader>
          <h3 className="text-lg font-semibold">📋 Informações do Board</h3>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-default-700 mb-1">
                Board URL:
              </p>
              <p className="text-xs text-default-500 break-all">
                https://trello.com/b/RVFcbKeF/n2-gestao
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-default-700 mb-1">
                Board ID:
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-default-100 px-2 py-1 rounded">
                  RVFcbKeF
                </code>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onClick={() => copyToClipboard('RVFcbKeF', 'Board ID')}
                >
                  <FiCopy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Next Steps */}
      <div className="text-center mt-8">
        <p className="text-sm text-default-600 mb-4">
          Após configurar as variáveis de ambiente, reinicie o servidor de
          desenvolvimento:
        </p>
        <div className="bg-default-100 dark:bg-default-800 p-3 rounded-lg inline-block">
          <code className="text-sm">npm run dev</code>
        </div>
      </div>
    </motion.div>
  );
};
