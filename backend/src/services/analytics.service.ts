import User from "../models/User";
import Policy from "../models/Policy";

export class AnalyticsService {
  static async getDashboardAnalytics() {
    const activeAgents = await User.countDocuments({ role: "Agent", isActive: true });
    const inactiveAgents = await User.countDocuments({ role: "Agent", isActive: false });

    const agentPolicies = await Policy.aggregate([
      {
        $group: {
          _id: "$agentId",
          policiesCount: { $sum: 1 },
          totalPremium: { $sum: "$premiumAmount" },
        },
      },
    ]);

    const agentWisePolicies = await Promise.all(
      agentPolicies.map(async (item) => {
        const agent = await User.findById(item._id).select("fullName");
        return {
          agentName: agent ? agent.fullName : "Unknown Agent",
          policiesCount: item.policiesCount,
          totalPremium: item.totalPremium,
        };
      })
    );

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyPolicies = await Policy.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          totalPremium: { $sum: "$premiumAmount" },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const monthlyTrends = monthlyPolicies.map((item) => {
      const monthStr = `${monthNames[item._id.month - 1]} ${item._id.year}`;
      return {
        month: monthStr,
        count: item.count,
        totalPremium: item.totalPremium,
      };
    });

    const finalMonthlyTrends = monthlyTrends.length > 0
      ? monthlyTrends
      : [{ month: monthNames[new Date().getMonth()], count: 0, totalPremium: 0 }];

    return {
      agentsStatus: { active: activeAgents, inactive: inactiveAgents },
      agentWisePolicies,
      monthlyTrends: finalMonthlyTrends,
    };
  }
}
