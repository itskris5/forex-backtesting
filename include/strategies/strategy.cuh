#ifndef STRATEGY_H
#define STRATEGY_H

#include <vector>
#include <string>
#include <map>
#include <algorithm>
#include "positions/position.cuh"
#include "types/configuration.cuh"

class Strategy {
    private:
        const char *symbol;
        std::map<std::string, int> *dataIndexMap;
        std::vector<Position*> openPositions;
        double profitLoss;
        int winCount;
        int loseCount;
        int consecutiveLosses;
        int maximumConsecutiveLosses;
        double minimumProfitLoss;

    protected:
        std::map<std::string, int> *getDataIndexMap();
        virtual void tick(double *dataPoint) = 0;
        double getWinRate();
        double getProfitLoss();
        void closeExpiredPositions(double price, time_t timestamp);
        void addPosition(Position *position);

    public:
        Strategy(const char *symbol, std::map<std::string, int> *dataIndexMap);
        virtual void backtest(double *dataPoint, double investment, double profitability) = 0;
        const char *getSymbol();
        void setProfitLoss(double profitLoss);
        std::map<std::string, double> *getResults();
};

#endif