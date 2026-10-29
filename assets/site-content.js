window.PORTFOLIO_CONTENT = {
  "meta": {
    "siteTitle": "潘厚霖｜游戏设计",
    "templateMode": false,
    "year": "2026"
  },
  "theme": {
    "accent": "#d3a062",
    "accentLight": "#f3cd96",
    "teal": "#a6d8cc",
    "cardColumns": 2,
    "maxWidth": 1240,
    "sectionSpace": 104,
    "cardStyle": "immersive"
  },
  "profile": {
    "name": "潘厚霖",
    "eyebrow": "游戏设计 / 技术设计",
    "headline": "游戏与交互",
    "intro": "",
    "heroImage": "assets/media/portfolio-docx/image3.png",
    "heroImageAlt": "《幽都绘卷》项目展示图",
    "profileTitle": "游戏玩法设计 / 系统设计 / 技术设计",
    "profileCopy": "硕士毕业于格拉斯哥大学（University of Glasgow）\n关注游戏玩法、交互与系统设计，擅长通过 Unity 和 Unreal Engine 5 搭建原型，把想法转化为可以体验和验证的内容。",
    "tags": [
      "Unity",
      "Unreal Engine 5",
      "VR 交互",
      "玩法系统",
      "关卡与 AI"
    ],
    "facts": []
  },
  "home": {
    "aboutIntro": "",
    "projectsIntro": "",
    "guideLabel": "03 / PROJECT STATUS",
    "guideTitle": "项目状态",
    "guideIntro": "作品集中既保留了完成项目，也展示了持续迭代的原型；项目详情页会说明当前完成范围与后续方向。",
    "guideSteps": [
      {
        "title": "已完成项目",
        "text": "《幽都绘卷》《锻刀模拟器（VR）》与《黄河清扫员》已具备可展示的项目内容。"
      },
      {
        "title": "开发中原型",
        "text": "《贪婪幽灵》《无限电梯》《心灵博物馆》与《So, we set off》将持续补充玩法、关卡或美术表现。"
      },
      {
        "title": "后续补充",
        "text": "个人介绍、联系方式、可试玩链接与演示视频将由本人后续添加。"
      }
    ]
  },
  "contact": {
    "heading": "联系方式",
    "intro": "",
    "email": "P2371109668@163.com",
    "resumeUrl": "",
    "videoUrl": "",
    "platformUrl": ""
  },
  "projects": [
    {
      "id": "scroll-of-phantom-city",
      "number": "01",
      "category": "UE5 / 已完成",
      "title": "幽都绘卷",
      "short": "一款以中国神话氛围为背景的 2D 类银河恶魔城项目，聚焦战斗状态机、敌人 AI 与空间引导。",
      "intro": "使用 Unreal Engine 5 开发。项目包含近战、消耗资源的远程攻击、闪避与跳劈等角色状态，并结合敌人行为树、探索路线和叙事道具构建关卡体验。",
      "meta": [
        {
          "label": "项目制作人数",
          "value": "团队项目"
        },
        {
          "label": "使用引擎",
          "value": "Unreal Engine 5"
        },
        {
          "label": "项目类型",
          "value": "2D 类银河恶魔城"
        },
        {
          "label": "核心方向",
          "value": "战斗、AI、关卡引导"
        }
      ],
      "cover": {
        "src": "assets/media/portfolio-docx/image1.png",
        "alt": "《幽都绘卷》关卡与路线引导"
      },
      "purpose": {
        "label": "01 / PROJECT OVERVIEW",
        "title": "项目概述",
        "text": "项目将战斗、探索与空间引导结合：玩家可以在关卡中获取叙事道具，同时通过观察环境、尝试跳跃路径与战斗规避逐步向前推进。",
        "cards": [
          {
            "title": "角色动作",
            "text": "近战攻击、消耗资源的远程攻击、闪避与跳劈均通过动画状态机组织。"
          },
          {
            "title": "探索叙事",
            "text": "场景中可获取带有剧情描述的道具，并在简单背包系统中查看。"
          }
        ]
      },
      "flow": {
        "label": "02 / GAMEPLAY FLOW",
        "title": "探索与战斗流程",
        "text": "关卡以向右探索为主要方向，让玩家在探索的过程中尝试多种路线达成不同目的。",
        "items": [
          {
            "title": "观察环境",
            "text": "从高低层空间、发光道具与可见路径中获取前进线索。"
          },
          {
            "title": "选择路线",
            "text": "利用楼梯、缺口与跳跃尝试抵达后续区域。"
          },
          {
            "title": "遭遇敌人或获得道具",
            "text": "获得可以释放远程攻击或者关于叙事的道具。并且通过击败敌人或尝试绕过敌人继续游戏。"
          },
          {
            "title": "持续推进",
            "text": "通过空间引导与节奏调整，逐步到达关卡终点。"
          }
        ]
      },
      "contribution": {
        "label": "03 / IMPLEMENTED CONTENT",
        "title": "实现内容",
        "text": "",
        "cards": [
          {
            "title": "主角状态机",
            "text": "完成近战、远程攻击、闪避和跳劈等动作状态。"
          },
          {
            "title": "敌人与 AI",
            "text": "制作 5 种敌人与 1 个 BOSS；部分敌人使用基于距离判断的行为树。"
          },
          {
            "title": "节奏调整",
            "text": "调节敌人移动速度与攻击位移，使玩家需要躲避但不会被无限追赶。"
          },
          {
            "title": "场景表现",
            "text": "制作场景 Shader，并通过上下层视野、栏杆与缺口组织探索引导。"
          }
        ]
      },
      "galleryLabel": "04 / SCREENSHOTS",
      "galleryTitle": "项目画面",
      "galleryText": "关卡路线、项目展示与场景氛围截图。",
      "gallery": [
        {
          "label": "关卡路线",
          "note": "通过空间层级与箭头说明探索方向。",
          "src": "assets/media/portfolio-docx/image1.png",
          "alt": "幽都绘卷关卡路线"
        },
        {
          "label": "场景氛围",
          "note": "项目中的神话风格场景与战斗画面。",
          "src": "assets/media/portfolio-docx/image2.png",
          "alt": "幽都绘卷场景氛围"
        },
        {
          "label": "项目展示",
          "note": "《幽都绘卷》项目概览。",
          "src": "assets/media/portfolio-docx/image3.png",
          "alt": "幽都绘卷项目展示板"
        }
      ],
      "video": {
        "label": "演示视频",
        "note": "暂无公开视频链接。",
        "url": ""
      },
      "reflection": {
        "label": "05 / Responsibilities",
        "title": "项目职责",
        "cards": [
          {
            "title": "",
            "text": "担任项目的总体策划，主要策划项目背景，关卡设计，美术风格"
          },
          {
            "title": "项目美术",
            "text": ""
          }
        ]
      },
      "resources": [],
      "teamSize": "团队项目",
      "multiplayer": true,
      "roles": [
        {
          "title": "项目总体策划",
          "text": "我在此项目负责前期策划游戏总体的背景故事，美术风格以及中期的关卡设计。"
        },
        {
          "title": "项目美术素材",
          "text": "同时，我还担任项目中的一部分美术，主要做了大部分的2D美术素材以及所有角色的动画。"
        }
      ],
      "prototypeCards": [
        {
          "title": "主角状态机",
          "text": "完成近战、远程攻击、闪避和跳劈等动作状态。"
        },
        {
          "title": "敌人与 AI",
          "text": "制作 5 种敌人与 1 个 BOSS；部分敌人使用基于距离判断的行为树。"
        },
        {
          "title": "节奏调整",
          "text": "调节敌人移动速度与攻击位移，使玩家需要躲避但不会被无限追赶。"
        },
        {
          "title": "场景表现",
          "text": "制作场景 Shader，并通过上下层视野、栏杆与缺口组织探索引导。"
        }
      ],
      "prototypeText": ""
    },
    {
      "id": "forging-simulator",
      "number": "02",
      "category": "UE5 VR / 已完成",
      "title": "锻刀模拟器（VR）",
      "short": "一款以完整锻刀流程为核心的 VR 模拟器项目，从选取图纸、加热锻打到组装与试刀。",
      "intro": "使用 Unreal Engine 5 开发，主要探索 VR 制作流程。玩家可选择刀型图纸与钢材，完成加热、锻打、打磨、刀柄组装与劈砍试刀。",
      "meta": [
        {
          "label": "项目制作人数",
          "value": "独立项目"
        },
        {
          "label": "使用引擎",
          "value": "Unreal Engine 5"
        },
        {
          "label": "项目类型",
          "value": "VR 模拟器"
        },
        {
          "label": "核心方向",
          "value": "流程交互、热度反馈、试刀"
        }
      ],
      "cover": {
        "src": "assets/media/portfolio-docx/image5.png",
        "alt": "《锻刀模拟器》项目展示图"
      },
      "purpose": {
        "label": "01 / PROJECT OVERVIEW",
        "title": "项目概述",
        "text": "项目围绕一把刀从图纸到成品的制作流程设计 VR 交互，让玩家通过连续操作理解加热、锻打、打磨、组装与试刀之间的关系。",
        "cards": [
          {
            "title": "流程体验",
            "text": "将选图纸、选钢材、加热、锻打、打磨、组装与测试串联为完整流程。"
          },
          {
            "title": "状态反馈",
            "text": "钢材热度会随时间下降，并以颜色和亮度提示；只有在热状态下才能进行锻造。"
          }
        ]
      },
      "flow": {
        "label": "02 / VR WORKFLOW",
        "title": "锻刀操作流程",
        "text": "玩家按工序操作，并根据钢材状态决定下一步行为。",
        "items": [
          {
            "title": "选择图纸",
            "text": "选取想要锻造的刀型图纸，并放置到图纸台上。"
          },
          {
            "title": "加热钢材",
            "text": "将钢材放入炉中加热，观察热度的颜色与亮度反馈。"
          },
          {
            "title": "锻打与打磨",
            "text": "在铁砧上敲打成型，再进行打磨。"
          },
          {
            "title": "组装与试刀",
            "text": "自由组装不同刀柄，并使用射线检测劈砍方向来测试木材。"
          }
        ]
      },
      "contribution": {
        "label": "03 / IMPLEMENTED CONTENT",
        "title": "文档已记录的实现内容",
        "text": "项目重点是 Unreal Engine 5 的 VR 制作流程与连续工序交互。",
        "cards": [
          {
            "title": "图纸与材料",
            "text": "通过选择不同的图纸，可以实现刀型的选择。选择不同的钢材将会决定最终刀刃的外观。"
          },
          {
            "title": "热度机制",
            "text": "钢材热度随时间降低，并通过颜色与亮度提供状态提示。"
          },
          {
            "title": "锻打与打磨",
            "text": "钢材热态下才可锻造，后续可进入打磨流程。"
          },
          {
            "title": "刀柄与试刀",
            "text": "可自由组装不同刀柄，并通过射线检测完成劈砍试刀。"
          }
        ]
      },
      "galleryLabel": "04 / SCREENSHOTS",
      "galleryTitle": "流程与项目展示",
      "galleryText": "锻刀步骤说明与项目展示板。",
      "gallery": [
        {
          "label": "锻刀流程",
          "note": "图纸、加热、锻打、打磨与组装的流程说明。",
          "src": "assets/media/portfolio-docx/image4.png",
          "alt": "锻刀模拟器流程图"
        },
        {
          "label": "项目展示",
          "note": "《锻刀模拟器》项目概览。",
          "src": "assets/media/portfolio-docx/image5.png",
          "alt": "锻刀模拟器项目展示板"
        }
      ],
      "video": {
        "label": "演示视频",
        "note": "暂无公开视频链接。",
        "url": ""
      },
      "reflection": {
        "label": "05 / CURRENT STATUS",
        "title": "当前状态",
        "cards": [
          {
            "title": "已完成内容",
            "text": "已形成从选图纸到试刀的完整 VR 操作流程。"
          },
          {
            "title": "后续补充",
            "text": "可继续补充实机演示、交互细节与项目分工说明。"
          }
        ]
      },
      "resources": [],
      "teamSize": "独立项目",
      "multiplayer": false,
      "roles": [],
      "prototypeCards": [
        {
          "title": "图纸与材料",
          "text": "通过选择不同的图纸，可以实现刀型的选择。选择不同的钢材将会决定最终刀刃的外观。"
        },
        {
          "title": "热度机制",
          "text": "钢材热度随时间降低，并通过颜色与亮度提供状态提示。"
        },
        {
          "title": "锻打与打磨",
          "text": "钢材热态下才可锻造，后续可进入打磨流程。"
        },
        {
          "title": "刀柄与试刀",
          "text": "可自由组装不同刀柄，并通过射线检测完成劈砍试刀。"
        }
      ],
      "prototypeText": "项目重点是 Unreal Engine 5 的 VR 制作流程与连续工序交互。"
    },
    {
      "id": "yellow-river-cleaner",
      "number": "03",
      "category": "UNITY / 已完成",
      "title": "黄河清扫员",
      "short": "NCDA 未来设计师参赛作品；以类《杀戮尖塔》战斗流程为参照，探索模块化与表格化卡牌配置。",
      "intro": "使用 Unity 开发。项目以卡牌战斗流程为核心，并通过模块化、表格化配置支持快速调整或创建不同数值的卡牌。",
      "meta": [
        {
          "label": "项目制作人数",
          "value": "独立项目"
        },
        {
          "label": "使用引擎",
          "value": "Unity"
        },
        {
          "label": "项目类型",
          "value": "卡牌战斗项目"
        },
        {
          "label": "项目背景",
          "value": "NCDA 未来设计师参赛作品"
        }
      ],
      "cover": {
        "src": "assets/media/portfolio-docx/image6.jpeg",
        "alt": "《黄河清扫员》战斗截图"
      },
      "purpose": {
        "label": "01 / PROJECT OVERVIEW",
        "title": "项目概述",
        "text": "项目围绕类《杀戮尖塔》的卡牌战斗流程进行实现与练习，并将卡牌数值配置设计为可模块化调整的结构。",
        "cards": [
          {
            "title": "战斗流程",
            "text": "实现以出牌、敌我反馈与战斗推进为核心的卡牌战斗体验。"
          },
          {
            "title": "数据配置",
            "text": "卡牌支持模块化与表格化配置，便于创建数值不同的卡牌。"
          }
        ]
      },
      "flow": {
        "label": "02 / BATTLE LOOP",
        "title": "核心战斗循环",
        "text": "本游戏玩法主要借鉴了《杀戮尖塔》。",
        "items": [
          {
            "title": "进入战斗",
            "text": "玩家进入卡牌战斗场景。"
          },
          {
            "title": "选择卡牌",
            "text": "在玩家的回合，玩家依据手牌信息与敌我双方的数值进行行动。"
          },
          {
            "title": "回合结束",
            "text": "完成敌我双方的伤害与状态反馈。"
          },
          {
            "title": "战斗结束",
            "text": "战斗结束后会获得新的卡牌。"
          }
        ]
      },
      "contribution": {
        "label": "03 / PROJECT FEATURES",
        "title": "项目特点",
        "text": "文档未进一步拆分团队中的个人模块，以下为项目中已记录的系统特点。",
        "cards": [
          {
            "title": "战斗框架",
            "text": "具备完整的类《杀戮尖塔》卡牌战斗流程。"
          },
          {
            "title": "模块化与表格化配置卡牌",
            "text": "卡牌可按模块化方式组织，便于扩展。可通过表格创建不同数值的卡牌。"
          },
          {
            "title": "表格化数值",
            "text": "可通过表格调整或创建数值不同的卡牌。"
          },
          {
            "title": "后续补充",
            "text": "个人分工与可试玩链接待本人补充。"
          }
        ]
      },
      "galleryLabel": "04 / SCREENSHOTS",
      "galleryTitle": "战斗画面",
      "galleryText": "卡牌战斗与 UI 画面截图。",
      "gallery": [
        {
          "label": "战斗界面",
          "note": "项目中的卡牌战斗画面。",
          "src": "assets/media/portfolio-docx/image6.jpeg",
          "alt": "黄河清扫员战斗界面"
        },
        {
          "label": "卡牌选择",
          "note": "项目中的手牌与战斗 UI。",
          "src": "assets/media/portfolio-docx/image7.png",
          "alt": "黄河清扫员卡牌界面"
        }
      ],
      "video": {
        "label": "演示视频",
        "note": "暂无公开视频链接。",
        "url": ""
      },
      "reflection": {
        "label": "05 / CURRENT STATUS",
        "title": "当前状态",
        "cards": [
          {
            "title": "已完成内容",
            "text": "已完成卡牌战斗流程与可配置的卡牌数据框架。"
          },
          {
            "title": "敌人表格化配置",
            "text": "可通过表格创建不同关卡的不同敌人配置。"
          }
        ]
      },
      "resources": [],
      "teamSize": "独立项目",
      "multiplayer": false,
      "roles": [],
      "prototypeCards": [
        {
          "title": "战斗框架",
          "text": "具备完整的类《杀戮尖塔》卡牌战斗流程。"
        },
        {
          "title": "模块化与表格化配置卡牌",
          "text": "卡牌可按模块化方式组织，便于扩展。可通过表格创建不同数值的卡牌。"
        },
        {
          "title": "敌人表格化配置",
          "text": "可通过表格创建不同关卡的不同敌人配置。"
        }
      ],
      "prototypeText": "该项目探索了模块化配置卡牌信息与敌人配置。"
    },
    {
      "id": "greedy-ghost",
      "number": "04",
      "category": "UNITY / 已完成",
      "title": "贪婪幽灵",
      "short": "一个围绕“同时旋转书架”展开的解谜小游戏 DEMO，玩家需要判断旋转是否会阻断道路。",
      "intro": "使用 Unity 开发。当前原型中，玩家可同时旋转所有带有蓝色发光书本的书架，需要提前考虑路径是否会被遮挡。",
      "meta": [
        {
          "label": "项目制作人数",
          "value": "独立项目"
        },
        {
          "label": "使用引擎",
          "value": "Unity"
        },
        {
          "label": "项目类型",
          "value": "解谜小游戏"
        },
        {
          "label": "核心机制",
          "value": "同步旋转与路径判断"
        }
      ],
      "cover": {
        "src": "assets/media/portfolio-docx/image8.jpeg",
        "alt": "《贪婪幽灵》书架机关截图"
      },
      "purpose": {
        "label": "01 / PROJECT OVERVIEW",
        "title": "项目概述",
        "text": "项目以书架旋转改变通路为核心机制，要求玩家在操作前预判多个书架同时旋转后对移动路径的影响。",
        "cards": []
      },
      "flow": {
        "label": "02 / PUZZLE LOOP",
        "title": "解谜循环",
        "text": "玩家观察机关与通路关系，再执行旋转并根据结果继续前进。",
        "items": [
          {
            "title": "观察布局",
            "text": "确认当前书架位置与可通行路径。"
          },
          {
            "title": "预判变化",
            "text": "思考同步旋转后哪些道路会被打开或阻断。"
          },
          {
            "title": "执行旋转",
            "text": "触发书架旋转操作。"
          },
          {
            "title": "继续探索",
            "text": "依据新的通路状态向下一处推进。"
          }
        ]
      },
      "contribution": {
        "label": "03 / CURRENT PROTOTYPE",
        "title": "当前原型与后续方向",
        "text": "以下内容依据文档中的当前功能与未来计划整理。",
        "cards": [
          {
            "title": "当前机制",
            "text": "完成蓝色发光书本书架的同步旋转与路径判断玩法。"
          },
          {
            "title": "红色书架",
            "text": "计划加入可同步旋转的红色书架，形成两类机关协同。"
          },
          {
            "title": "速度差异",
            "text": "计划加入旋转速度不一致的特殊同色书架。"
          },
          {
            "title": "解谜深度",
            "text": "通过更多旋转关系增加玩家的预判与规划需求。"
          }
        ]
      },
      "galleryLabel": "04 / SCREENSHOTS",
      "galleryTitle": "原型截图",
      "galleryText": "书架机关与空间路径截图。",
      "gallery": [
        {
          "label": "书架机关",
          "note": "当前原型中的可旋转书架。",
          "src": "assets/media/portfolio-docx/image8.jpeg",
          "alt": "贪婪幽灵书架机关"
        }
      ],
      "video": {
        "label": "演示视频",
        "note": "暂无公开视频链接。",
        "url": ""
      },
      "reflection": {
        "label": "05 / NEXT STEP",
        "title": "下一步方向",
        "cards": [
          {
            "title": "扩展机关种类",
            "text": "加入红色书架与特殊旋转速度的同色书架。"
          },
          {
            "title": "完善关卡",
            "text": "通过多种机关关系增加路线规划与解谜层次。"
          }
        ]
      },
      "resources": [],
      "teamSize": "独立项目",
      "multiplayer": false,
      "roles": [],
      "prototypeCards": [],
      "prototypeText": ""
    },
    {
      "id": "infinite-elevator",
      "number": "05",
      "category": "UNITY / 已完成",
      "title": "无限电梯",
      "short": "一款在不断下降的电梯中完成即时反应挑战的小游戏 DEMO，结合区域判定、生命值、分数与随机因素。",
      "intro": "使用 Unity 开发。玩家每到达一层，都需要在限定时间内将指针停在绿色区域；红色区域或超时会直接失败，黄色区域扣除生命值，蓝色区域可恢复生命值。",
      "meta": [
        {
          "label": "项目制作人数",
          "value": "独立项目"
        },
        {
          "label": "使用引擎",
          "value": "Unity"
        },
        {
          "label": "项目类型",
          "value": "即时反应小游戏"
        },
        {
          "label": "核心机制",
          "value": "区域判定、随机与连关"
        }
      ],
      "cover": {
        "src": "assets/media/portfolio-docx/image9.png",
        "alt": "《无限电梯》游戏画面"
      },
      "purpose": {
        "label": "01 / PROJECT OVERVIEW",
        "title": "项目概述",
        "text": "项目通过不断下降的电梯和逐层出现的即时反应挑战，让玩家在有限时间内完成精确判定，并承受随机区域分布带来的不确定性。",
        "cards": [
          {
            "title": "即时判定",
            "text": "玩家需在限定时间内让指针停在绿色区域。"
          },
          {
            "title": "风险与恢复",
            "text": "红色区域或超时直接失败；黄色扣血；蓝色可恢复生命值。"
          }
        ]
      },
      "flow": {
        "label": "02 / GAMEPLAY FLOW",
        "title": "每层挑战流程",
        "text": "玩家随电梯下降进入新的楼层，并处理该层生成的反应挑战。",
        "items": [
          {
            "title": "进入楼层",
            "text": "电梯下降至新楼层，出现新的挑战。"
          },
          {
            "title": "观察区域",
            "text": "识别绿色、黄色、红色或特殊蓝色区域。"
          },
          {
            "title": "把握时机",
            "text": "在时间内控制指针停下。"
          },
          {
            "title": "结算状态",
            "text": "根据停留区域更新生命值、分数与楼层进度。"
          }
        ]
      },
      "contribution": {
        "label": "03 / CURRENT PROTOTYPE",
        "title": "当前原型内容",
        "text": "项目已具备基础反应判定、生命与分数反馈，并加入随机化参数。",
        "cards": [
          {
            "title": "区域逻辑",
            "text": "绿色成功、红色或超时失败、黄色损失生命、蓝色恢复生命。"
          },
          {
            "title": "进度反馈",
            "text": "成功后增加楼层数与总分数。"
          },
          {
            "title": "随机因素",
            "text": "区域按规则随机分布，比如可能不存在黄色区域或出现蓝色区域。指针也会有用不同的移动速度。"
          },
          {
            "title": "速度变化",
            "text": "指针包含两种不同速度，增加反应节奏差异。"
          }
        ]
      },
      "galleryLabel": "04 / SCREENSHOTS",
      "galleryTitle": "原型截图",
      "galleryText": "不同楼层和区域判定状态。",
      "gallery": [
        {
          "label": "楼层 0",
          "note": "初始楼层中的电梯与判定区域。",
          "src": "assets/media/portfolio-docx/image9.png",
          "alt": "无限电梯初始画面"
        },
        {
          "label": "楼层 1",
          "note": "下一楼层中的即时反应挑战。",
          "src": "assets/media/portfolio-docx/image10.png",
          "alt": "无限电梯楼层挑战"
        }
      ],
      "video": {
        "label": "演示视频",
        "note": "暂无公开视频链接。",
        "url": ""
      },
      "reflection": {
        "label": "05 / NEXT STEP",
        "title": "下一步方向",
        "cards": [
          {
            "title": "扩展小游戏",
            "text": "计划加入不同类型的即时反应小游戏。"
          },
          {
            "title": "变化场景",
            "text": "计划让新楼层同时带来玩法与场景变化。"
          }
        ]
      },
      "resources": [],
      "teamSize": "独立项目",
      "multiplayer": false,
      "roles": [],
      "prototypeCards": [
        {
          "title": "区域逻辑",
          "text": "绿色成功、红色或超时失败、黄色损失生命、蓝色恢复生命。"
        },
        {
          "title": "进度反馈",
          "text": "成功后增加楼层数与总分数。"
        },
        {
          "title": "随机因素",
          "text": "区域按规则随机分布，比如可能不存在黄色区域或出现蓝色区域。指针也会有用不同的移动速度。"
        }
      ],
      "prototypeText": "项目已具备基础反应判定、生命与分数反馈，并加入随机化参数。"
    },
    {
      "id": "mind-museum",
      "number": "06",
      "category": "UNITY / 已完成",
      "title": "心灵博物馆",
      "short": "一款在随机房间中寻找文物、阅读描述并将文物放置到对应展台的探索与匹配游戏。",
      "intro": "使用 Unity 开发。随机地图中会生成没有名称的文物和对应描述；描述中包含名称与特征，玩家需要找到指定文物并放置到正确展台。",
      "meta": [
        {
          "label": "项目制作人数",
          "value": "独立项目"
        },
        {
          "label": "使用引擎",
          "value": "Unity"
        },
        {
          "label": "项目类型",
          "value": "探索 / 匹配游戏"
        },
        {
          "label": "核心方向",
          "value": "随机地图与随机房间"
        }
      ],
      "cover": {
        "src": "assets/media/portfolio-docx/image12.png",
        "alt": "《心灵博物馆》随机房间截图"
      },
      "purpose": {
        "label": "01 / PROJECT OVERVIEW",
        "title": "项目概述",
        "text": "项目将随机生成的房间、文物与文字描述结合，让玩家通过探索与比对完成文物和展台的匹配。",
        "cards": [
          {
            "title": "随机空间",
            "text": "项目重点探索随机生成地图与随机房间的制作流程。"
          },
          {
            "title": "信息匹配",
            "text": "文物本身没有名称，玩家需依据描述中的名称与特征进行判断。"
          }
        ]
      },
      "flow": {
        "label": "02 / PLAYER JOURNEY",
        "title": "探索与匹配流程",
        "text": "玩家在随机空间中获取线索、确认对象，并完成展台放置。",
        "items": [
          {
            "title": "进入房间",
            "text": "在随机生成的地图与房间中开始探索。"
          },
          {
            "title": "寻找文物与文物描述",
            "text": "发现没有名称标注的文物以及文物描述。"
          },
          {
            "title": "放置展台",
            "text": "根据文物的描述，将指定文物放置到正确的展台。"
          }
        ]
      },
      "contribution": {
        "label": "03 / CURRENT PROTOTYPE",
        "title": "当前原型内容",
        "text": "文档记录的当前重点为随机空间生成及文物匹配流程。",
        "cards": [
          {
            "title": "表格化配置随机生成地图",
            "text": "探索随机生成地图的制作流程。每一关中地图会根据表格中记述的房间类型与数量，在一定范围内生成随机地图。"
          },
          {
            "title": "表格化配置生成随机房间",
            "text": "探索不同房间的随机生成方式。每个房间会根据当前关卡的表格生成不同的布局。"
          },
          {
            "title": "文物分布",
            "text": "根据该关卡的需要，在空间中的对应随机位置生成文物以及对应的描述信息。"
          },
          {
            "title": "展台匹配",
            "text": "实现将指定文物放置到指定展台的核心目标。"
          }
        ]
      },
      "galleryLabel": "04 / SCREENSHOTS",
      "galleryTitle": "原型截图",
      "galleryText": "文字线索、房间布局与文物匹配画面。",
      "gallery": [
        {
          "label": "文字线索",
          "note": "任务说明与文物描述界面。",
          "src": "assets/media/portfolio-docx/image11.png",
          "alt": "心灵博物馆文字线索"
        },
        {
          "label": "随机房间",
          "note": "随机生成的房间与路线。",
          "src": "assets/media/portfolio-docx/image12.png",
          "alt": "心灵博物馆随机房间"
        },
        {
          "label": "文物匹配",
          "note": "文物与目标位置的交互画面。",
          "src": "assets/media/portfolio-docx/image13.png",
          "alt": "心灵博物馆文物匹配"
        },
        {
          "label": "空间探索",
          "note": "项目中的随机空间场景。",
          "src": "assets/media/portfolio-docx/image14.png",
          "alt": "心灵博物馆空间探索"
        }
      ],
      "video": {
        "label": "演示视频",
        "note": "暂无公开视频链接。",
        "url": ""
      },
      "reflection": {
        "label": "05 / NEXT STEP",
        "title": "下一步方向",
        "cards": [
          {
            "title": "丰富房间",
            "text": "当前房间场景较单调，后续计划增加更多空间变化。"
          },
          {
            "title": "加入解谜阻碍",
            "text": "计划加入开关、陷阱或传送装置等机制，让玩家需通过其他房间才能继续前进。"
          }
        ]
      },
      "resources": [],
      "teamSize": "独立项目",
      "multiplayer": false,
      "roles": [],
      "prototypeCards": [
        {
          "title": "表格化配置随机生成地图",
          "text": "探索随机生成地图的制作流程。每一关中地图会根据表格中记述的房间类型与数量，在一定范围内生成随机地图。"
        },
        {
          "title": "表格化配置生成随机房间",
          "text": "探索不同房间的随机生成方式。每个房间会根据当前关卡的表格生成不同的布局。"
        },
        {
          "title": "文物分布",
          "text": "根据该关卡的需要，在空间中的对应随机位置生成文物以及对应的描述信息。"
        },
        {
          "title": "展台匹配",
          "text": "实现将指定文物放置到指定展台的核心目标。"
        }
      ],
      "prototypeText": "本项目的重点为随机空间生成及文物匹配流程。"
    },
    {
      "id": "so-we-set-off",
      "number": "07",
      "category": "UNITY / 已完成",
      "title": "So, we set off",
      "short": "一款将三消资源积累与回合制战斗结合的 Unity 原型，拥有模块化敌人与技能配置。",
      "intro": "玩家在类似《杀戮尖塔》的路径地图上进入节点战斗。每回合拥有指定步数；在棋盘中消除元素可触发伤害、治疗、恢复和冻结等效果，也可积累资源释放技能。",
      "meta": [
        {
          "label": "项目制作人数",
          "value": "团队项目"
        },
        {
          "label": "使用引擎",
          "value": "Unity"
        },
        {
          "label": "项目类型",
          "value": "三消 + 回合制战斗"
        },
        {
          "label": "核心方向",
          "value": "资源、技能、模块化配置"
        }
      ],
      "cover": {
        "src": "assets/media/portfolio-docx/image15.jpeg",
        "alt": "《So, we set off》战斗场景截图"
      },
      "purpose": {
        "label": "01 / PROJECT OVERVIEW",
        "title": "项目概述",
        "text": "项目将三消操作和回合制战斗连接起来：每次消除既会产生直接效果，也会累积为技能资源，让玩家在步数、即时结算与后续技能之间进行取舍。",
        "cards": [
          {
            "title": "消除效果",
            "text": "不同元素可触发随机单体伤害、范围伤害、恢复、治疗和冻结等效果。"
          },
          {
            "title": "资源技能",
            "text": "被消除的元素会积累为资源，用于释放消耗指定元素的技能。"
          }
        ]
      },
      "flow": {
        "label": "02 / CORE LOOP",
        "title": "核心玩法循环",
        "text": "玩家从路径节点进入战斗，在有限步数内消除元素、结算效果并使用积累的资源释放技能。",
        "items": [
          {
            "title": "选择节点",
            "text": "在类似《杀戮尖塔》的路径地图中进入战斗节点。"
          },
          {
            "title": "消除元素",
            "text": "在指定步数内完成三消操作。"
          },
          {
            "title": "结算效果",
            "text": "根据元素触发伤害、范围伤害、恢复、治疗或冻结并获得对应的元素资源。"
          },
          {
            "title": "释放技能",
            "text": "消耗积累的指定元素资源，使用已获得的技能。"
          },
          {
            "title": "结束回合",
            "text": "玩家在耗尽所有可行动步数后将无法完成三消玩法，此时可以结束回合，进入敌方回合，敌人行动后再进入自己的回合。"
          }
        ]
      },
      "contribution": {
        "label": "03 / CURRENT PROTOTYPE",
        "title": "当前系统内容",
        "text": "当前原型已搭建主要框架，后续将继续完善数值和美术进度。",
        "cards": [
          {
            "title": "三消结算",
            "text": "消除元素会带来攻击、范围攻击、恢复、治疗和冻结等效果。"
          },
          {
            "title": "资源机制",
            "text": "元素数量可作为资源积累，支持消耗指定元素释放技能。"
          },
          {
            "title": "技能配置",
            "text": "技能可模块化、表格化配置，便于修改或增加新类型。"
          },
          {
            "title": "敌人配置",
            "text": "敌人同样采用模块化与表格化配置结构。"
          }
        ]
      },
      "galleryLabel": "04 / SCREENSHOTS",
      "galleryTitle": "系统与战斗画面",
      "galleryText": "战斗场景、技能选择与棋盘消除画面。",
      "gallery": [
        {
          "label": "战斗场景",
          "note": "项目中的角色与战斗环境。",
          "src": "assets/media/portfolio-docx/image15.jpeg",
          "alt": "So we set off 战斗场景"
        },
        {
          "label": "技能选择",
          "note": "技能与元素资源相关的 UI。",
          "src": "assets/media/portfolio-docx/image16.jpeg",
          "alt": "So we set off 技能选择"
        },
        {
          "label": "三消战斗",
          "note": "棋盘消除与回合制战斗界面。",
          "src": "assets/media/portfolio-docx/image17.jpeg",
          "alt": "So we set off 三消战斗"
        }
      ],
      "video": {
        "label": "演示视频",
        "note": "暂无公开视频链接。",
        "url": ""
      },
      "reflection": {
        "label": "05 / NEXT STEP",
        "title": "下一步方向",
        "cards": [
          {
            "title": "完善数值",
            "text": "整体框架已搭建，后续需要继续完善各类数值。"
          },
          {
            "title": "跟进美术",
            "text": "后续将继续跟进美术进度与整体表现。"
          }
        ]
      },
      "resources": [],
      "teamSize": "团队项目",
      "multiplayer": true,
      "roles": [
        {
          "title": "设计整个战斗模块",
          "text": "在该项目中，我主要担任设计战斗模块这一职责。我负责设计了三消玩法与回合制战斗的实现与结合。负责模块化配置角色与敌人以及技能的脚本。"
        }
      ],
      "prototypeCards": [
        {
          "title": "三消结算",
          "text": "消除元素会带来攻击、范围攻击、恢复、治疗和冻结等效果。"
        },
        {
          "title": "资源机制",
          "text": "元素数量可作为资源积累，支持消耗指定元素释放技能。"
        },
        {
          "title": "技能配置",
          "text": "技能可模块化、表格化配置，便于修改或增加新类型。"
        },
        {
          "title": "敌人配置",
          "text": "敌人同样采用模块化与表格化配置结构。"
        }
      ],
      "prototypeText": "该项目主要探索了三消玩法与回合制战斗结合的玩法。\n"
    }
  ]
};
