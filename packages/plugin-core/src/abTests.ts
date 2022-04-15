// ^xi5t1r2j51ot
import { ABTest } from "@dendronhq/common-server";

export enum UpgradeToastWordingTestGroups {
  /** The button on the upgrade toast will say "see what changed" */
  seeWhatChanged = "seeWhatChanged",
  /** The button on the upgrade toast will say "see what's new" */
  seeWhatsNew = "seeWhatsNew",
  /** The button on the upgrade toast will say "open the changelog" */
  openChangelog = "openChangelog",
}

/** Test if showing a web view on an upgrade is more successful than showing a toast notification. */
export const UPGRADE_TOAST_WORDING_TEST = new ABTest(
  "UpgradeToastWordingTest",
  [
    {
      name: UpgradeToastWordingTestGroups.seeWhatChanged,
      weight: 1,
    },
    {
      name: UpgradeToastWordingTestGroups.seeWhatsNew,
      weight: 1,
    },
    {
      name: UpgradeToastWordingTestGroups.openChangelog,
      weight: 1,
    },
  ]
);

export enum MeetingNoteTestGroups {
  show = "show",
  noShow = "noShow",
}
export const MEETING_NOTE_TUTORIAL_TEST = new ABTest(
  "MeetingNoteTutorialTest",
  [
    {
      name: MeetingNoteTestGroups.show,
      weight: 1,
    },
    {
      name: MeetingNoteTestGroups.noShow,
      weight: 1,
    },
  ]
);

export const MEETING_NOTE_FEATURE_SHOWCASE_TEST = new ABTest(
  "MeetingNoteFeatureShowcaseTest",
  [
    {
      name: MeetingNoteTestGroups.show,
      weight: 1,
    },
    {
      name: MeetingNoteTestGroups.noShow,
      weight: 1,
    },
  ]
);

/** All A/B tests that are currently running.
 *
 * ^tkqhy45hflfd
 */
export const CURRENT_AB_TESTS = [
  UPGRADE_TOAST_WORDING_TEST,
  MEETING_NOTE_TUTORIAL_TEST,
  MEETING_NOTE_FEATURE_SHOWCASE_TEST,
];
