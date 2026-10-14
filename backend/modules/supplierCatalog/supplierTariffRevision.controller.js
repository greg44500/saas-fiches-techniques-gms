import {
    correctArticlePrice,
    correctArticleTariffPeriod,
    listArticlePriceHistory,
} from './supplierTariffRevision.service.js';

const listWorkspaceArticleTariffs = async (req, res) => {
    const result = await listArticlePriceHistory({
        articleId: req.validated.params.articleId,
        workspaceId: req.workspace._id,
    });
    res.status(200).json({ status: 'success', data: result });
};

const correctWorkspaceArticleTariff = async (req, res) => {
    const result = await correctArticlePrice({
        articleId: req.validated.params.articleId,
        tariffId: req.validated.params.tariffId,
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        data: req.validated.body,
    });
    res.status(200).json({ status: 'success', data: result });
};

const correctWorkspaceArticleTariffPeriod = async (req, res) => {
    const result = await correctArticleTariffPeriod({
        articleId: req.validated.params.articleId,
        tariffId: req.validated.params.tariffId,
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        data: req.validated.body,
    });
    res.status(200).json({ status: 'success', data: result });
};

export {
    correctWorkspaceArticleTariff,
    correctWorkspaceArticleTariffPeriod,
    listWorkspaceArticleTariffs,
};
