import type { AuthoredPassage } from '@recall/core';

const passage: AuthoredPassage = {
  id: 'p20-bumblebees',
  title: 'Bumblebees in spring',
  subject: 'nature',
  summary: 'How bumblebee queens survive the winter, and how they can fly on chilly days.',
  density: 'medium',
  kind: 'library',
  factNotes:
    'Bumblebee colony cycle: the colony (old queen, workers, males) dies in autumn; newly mated queens hibernate, often just underground; queens emerge in late winter or early spring (often February or March, depending on species and weather), feed on early flowers such as willow and crocus, and find nest sites such as old mammal burrows. Bumblebees warm up by shivering their flight muscles with the wings still, and their dense hair holds in heat, so they can fly in cooler weather than honeybees. High confidence.',
  sections: [
    {
      id: 's1',
      text: 'A bumblebee colony lasts for just one season. In autumn, the old queen, the workers and the males all die. Only the young queens, which have mated in late summer, survive the winter. Each one finds a sheltered spot, often a little way underground in a bank of soil, and hibernates until the weather begins to warm up again.',
      ideas: [
        {
          id: 's1-i1',
          text: 'In autumn the old queen, workers and males die, and only the young queens survive the winter.',
          sourceSpans: [
            'Only the young queens, which have mated in late summer, survive the winter',
            'In autumn, the old queen, the workers and the males all die',
          ],
          qualifiers: ['only'],
          relation: 'sequence',
          topic: 'which bees make it through winter',
          semanticCue: 'Think about which members of the colony carry it on to the next year.',
          clozeAnswers: ['young queens'],
        },
        {
          id: 's1-i2',
          text: 'Each young queen hibernates in a sheltered spot, often just underground, until it warms up.',
          sourceSpans: [
            'Each one finds a sheltered spot, often a little way underground in a bank of soil, and hibernates until the weather begins to warm up again',
          ],
          qualifiers: ['often'],
          relation: 'fact',
          topic: 'where the queens spend the winter',
          semanticCue: 'Think about a safe hiding place in the earth.',
          clozeAnswers: ['underground', 'hibernates'],
        },
      ],
      question: {
        id: 's1-q1',
        prompt: 'Which bumblebees survive the winter?',
        options: ['The whole colony, huddled together', 'Only the young queens', 'Only the males'],
        answerIndex: 1,
        explanationSpan:
          'Only the young queens, which have mated in late summer, survive the winter.',
      },
    },
    {
      id: 's2',
      text: "Queen bumblebees are among the first insects to appear in early spring, often on mild days in February or March. A queen's first task is to feed on nectar and pollen from early flowers, such as crocuses and willow catkins, to build up her strength. Then she searches for a nest site, such as an old mouse hole, and lays her first eggs. These grow into workers who take over the foraging.",
      ideas: [
        {
          id: 's2-i1',
          text: 'Queens often appear on mild days in February or March and feed on early flowers to build strength.',
          sourceSpans: [
            'Queen bumblebees are among the first insects to appear in early spring, often on mild days in February or March',
            "A queen's first task is to feed on nectar and pollen from early flowers",
          ],
          qualifiers: ['often'],
          relation: 'sequence',
          topic: 'when the queens wake up',
          semanticCue: 'Think about the end of winter and the first flowers of the year.',
          clozeAnswers: ['early spring'],
        },
        {
          id: 's2-i2',
          text: 'Next she finds a nest site, such as an old mouse hole, and lays eggs that grow into workers.',
          sourceSpans: [
            'Then she searches for a nest site, such as an old mouse hole, and lays her first eggs',
            'These grow into workers who take over the foraging',
          ],
          qualifiers: [],
          relation: 'sequence',
          topic: 'starting a new colony',
          semanticCue: 'Think about a ready-made home left behind by a small animal.',
          clozeAnswers: ['nest site', 'mouse hole'],
        },
      ],
      question: {
        id: 's2-q1',
        prompt: 'What does a queen bumblebee do first after waking in spring?',
        options: [
          'She lays eggs straight away',
          'She joins another colony',
          'She feeds on early flowers to build up her strength',
        ],
        answerIndex: 2,
        explanationSpan:
          "A queen's first task is to feed on nectar and pollen from early flowers, such as crocuses and willow catkins, to build up her strength.",
      },
    },
    {
      id: 's3',
      text: 'Bumblebees can fly in cooler weather than honeybees. Before take-off, a bumblebee can warm itself up by shivering its flight muscles while keeping its wings still, a little like an engine warming up. Its thick, furry coat helps to hold in the heat. This means bumblebees can be seen feeding on chilly, dull days when few honeybees are flying.',
      ideas: [
        {
          id: 's3-i1',
          text: 'A bumblebee warms up by shivering its flight muscles while its wings stay still.',
          sourceSpans: [
            'a bumblebee can warm itself up by shivering its flight muscles while keeping its wings still',
          ],
          qualifiers: [],
          relation: 'cause_effect',
          topic: 'how a bumblebee warms up',
          semanticCue: 'Think about what your own body does when you are cold.',
          clozeAnswers: ['shivering', 'flight muscles'],
        },
        {
          id: 's3-i2',
          text: 'With help from its furry coat, this lets it fly in cooler weather than honeybees.',
          sourceSpans: [
            'Bumblebees can fly in cooler weather than honeybees',
            'Its thick, furry coat helps to hold in the heat',
          ],
          qualifiers: [],
          relation: 'comparison',
          topic: 'flying on cold days',
          semanticCue: 'Compare a bumblebee with its smaller, less hairy relative.',
          clozeAnswers: ['cooler weather', 'honeybees'],
        },
      ],
      question: {
        id: 's3-q1',
        prompt: 'How can bumblebees fly on chilly days?',
        options: [
          'They warm their flight muscles by shivering',
          'They wait in the hive until the sun comes out',
          'They follow honeybees to warmer places',
        ],
        answerIndex: 0,
        explanationSpan:
          'a bumblebee can warm itself up by shivering its flight muscles while keeping its wings still',
      },
    },
  ],
};

export default passage;
